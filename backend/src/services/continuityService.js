import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getOrCreatePrimaryVault } from './vaultService.js';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

// Preset Options Validation
const VALID_FREQUENCIES = [30, 60, 90, 180, 365];
const VALID_GRACE_PERIODS = [7, 14, 30];

/**
 * Get or create the user's check-in settings.
 */
export async function getSettings(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const settingsRef = vaultsCollection.doc(vault.id).collection('continuitySettings').doc('default');
  const doc = await settingsRef.get();

  if (doc.exists) {
    return doc.data();
  }

  // Create default settings
  const lastCheckIn = new Date();
  const nextDue = new Date();
  nextDue.setDate(lastCheckIn.getDate() + 90); // Default 90 days frequency

  const defaultSettings = {
    id: 'default',
    ownerId: uid,
    vaultId: vault.id,
    checkInFrequencyDays: 90,
    gracePeriodDays: 14,
    status: 'active', // active, due, reminder_sent, grace_period, missed, paused
    lastCheckInAt: lastCheckIn,
    nextCheckInDueAt: nextDue,
    gracePeriodEndsAt: null,
    missedCheckInCount: 0,
    reminderCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await settingsRef.set(defaultSettings);
  return defaultSettings;
}

/**
 * Update check-in frequency and grace periods.
 */
export async function updateSettings(uid, data) {
  const vault = await getOrCreatePrimaryVault(uid);
  const settingsRef = vaultsCollection.doc(vault.id).collection('continuitySettings').doc('default');
  const doc = await settingsRef.get();

  if (!doc.exists) {
    const error = new Error('Continuity settings not found.');
    error.status = 454;
    throw error;
  }

  const current = doc.data();

  const checkInFrequencyDays = parseInt(data.checkInFrequencyDays, 10);
  const gracePeriodDays = parseInt(data.gracePeriodDays, 10);

  if (data.checkInFrequencyDays !== undefined && !VALID_FREQUENCIES.includes(checkInFrequencyDays)) {
    const error = new Error(`Frequency must be one of: ${VALID_FREQUENCIES.join(', ')} days.`);
    error.status = 400;
    throw error;
  }

  if (data.gracePeriodDays !== undefined && !VALID_GRACE_PERIODS.includes(gracePeriodDays)) {
    const error = new Error(`Grace period must be one of: ${VALID_GRACE_PERIODS.join(', ')} days.`);
    error.status = 400;
    throw error;
  }

  const allowedUpdates = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.checkInFrequencyDays !== undefined) allowedUpdates.checkInFrequencyDays = checkInFrequencyDays;
  if (data.gracePeriodDays !== undefined) allowedUpdates.gracePeriodDays = gracePeriodDays;

  // If status is active, re-calculate the next due date based on lastCheckInAt
  if (current.status === 'active') {
    const freq = data.checkInFrequencyDays !== undefined ? checkInFrequencyDays : current.checkInFrequencyDays;
    const lastCheckIn = current.lastCheckInAt.toDate ? current.lastCheckInAt.toDate() : new Date(current.lastCheckInAt);
    const nextDue = new Date(lastCheckIn);
    nextDue.setDate(lastCheckIn.getDate() + freq);
    allowedUpdates.nextCheckInDueAt = nextDue;
  }

  await settingsRef.update(allowedUpdates);
  const updatedDoc = await settingsRef.get();
  return updatedDoc.data();
}

/**
 * Perform manual check-in. This acts as the Safety Override:
 * Marks setting ACTIVE, resets timers/reminders, cancels pending confirmations, re-secures active rules.
 */
export async function checkIn(uid, method = 'manual') {
  const vault = await getOrCreatePrimaryVault(uid);
  const settingsRef = vaultsCollection.doc(vault.id).collection('continuitySettings').doc('default');
  const doc = await settingsRef.get();

  const settings = doc.exists ? doc.data() : await getSettings(uid);

  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setDate(now.getDate() + settings.checkInFrequencyDays);

  // 1. Update Settings
  await settingsRef.update({
    status: 'active',
    lastCheckInAt: now,
    nextCheckInDueAt: nextDue,
    gracePeriodEndsAt: null,
    missedCheckInCount: 0,
    reminderCount: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Add history record
  const checkInRef = vaultsCollection.doc(vault.id).collection('checkIns').doc();
  await checkInRef.set({
    id: checkInRef.id,
    ownerId: uid,
    vaultId: vault.id,
    checkedInAt: now,
    method,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 3. SAFETY RESET OVERRIDE: Revoke pending confirmation requests and reset rule states
  const confirmationsRef = vaultsCollection.doc(vault.id).collection('confirmations');
  const pendingConfirmations = await confirmationsRef.where('status', '==', 'pending').get();
  const batch = firestoreAdmin.batch();
  
  pendingConfirmations.docs.forEach(doc => {
    batch.update(doc.ref, {
      status: 'revoked',
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  // Reset rules that were triggered, verification_pending, or eligible back to active
  const rulesRef = vaultsCollection.doc(vault.id).collection('legacyRules');
  const affectedRules = await rulesRef.get();
  
  affectedRules.docs.forEach(doc => {
    const rule = doc.data();
    if (['triggered', 'verification_pending', 'eligible'].includes(rule.status)) {
      batch.update(doc.ref, {
        status: 'active',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });

  await batch.commit();
  await logAuditEvent(vault.id, uid, uid, 'check_in_completed', 'vault', vault.id);

  const updatedDoc = await settingsRef.get();
  return updatedDoc.data();
}

/**
 * Pause continuity check-ins.
 */
export async function pauseContinuity(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const settingsRef = vaultsCollection.doc(vault.id).collection('continuitySettings').doc('default');
  
  await settingsRef.update({
    status: 'paused',
    nextCheckInDueAt: null,
    gracePeriodEndsAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(vault.id, uid, uid, 'continuity_paused', 'vault', vault.id);
  const updatedDoc = await settingsRef.get();
  return updatedDoc.data();
}

/**
 * Resume continuity check-ins.
 */
export async function resumeContinuity(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const settingsRef = vaultsCollection.doc(vault.id).collection('continuitySettings').doc('default');
  const doc = await settingsRef.get();
  const settings = doc.data();

  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setDate(now.getDate() + settings.checkInFrequencyDays);

  await settingsRef.update({
    status: 'active',
    lastCheckInAt: now,
    nextCheckInDueAt: nextDue,
    gracePeriodEndsAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(vault.id, uid, uid, 'continuity_resumed', 'vault', vault.id);
  const updatedDoc = await settingsRef.get();
  return updatedDoc.data();
}

/**
 * Retrieve check-in history logs.
 */
export async function getHistory(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const snapshot = await vaultsCollection
    .doc(vault.id)
    .collection('checkIns')
    .orderBy('checkedInAt', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => doc.data());
}
