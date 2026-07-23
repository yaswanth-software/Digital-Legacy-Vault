import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * Log a security event to vaults/{vaultId}/securityEvents
 */
export async function logSecurityEvent(vaultId, ownerId, eventType, severity = 'medium', details = {}) {
  try {
    if (!vaultsCollection || !vaultId) return null;

    const eventRef = vaultsCollection.doc(vaultId).collection('securityEvents').doc();
    const eventId = eventRef.id;

    const validSeverity = SEVERITY_LEVELS.includes(severity) ? severity : 'medium';

    // Never log sensitive payload fields, passwords, or tokens!
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.encryptionKey;
    delete sanitizedDetails.privateKey;

    const event = {
      id: eventId,
      ownerId,
      vaultId,
      eventType, // e.g. failed_access_attempt, unauthorized_asset_access, expired_release_access_attempt, etc.
      severity: validSeverity,
      details: sanitizedDetails,
      acknowledged: false,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    await eventRef.set(event);
    return event;
  } catch (error) {
    console.error('Failed to log security event:', error.message);
    return null;
  }
}

/**
 * Fetch security events for vault owner.
 */
export async function getSecurityEvents(uid, limitCount = 50) {
  const vault = await getOrCreatePrimaryVault(uid);
  const snapshot = await vaultsCollection.doc(vault.id).collection('securityEvents')
    .orderBy('timestamp', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map(doc => doc.data());
}

/**
 * Acknowledge a security event.
 */
export async function acknowledgeSecurityEvent(uid, eventId) {
  const vault = await getOrCreatePrimaryVault(uid);
  const eventRef = vaultsCollection.doc(vault.id).collection('securityEvents').doc(eventId);
  const eventDoc = await eventRef.get();

  if (!eventDoc.exists) {
    const error = new Error('Security event not found.');
    error.status = 404;
    throw error;
  }

  await eventRef.update({
    acknowledged: true,
    acknowledgedAt: FieldValue.serverTimestamp(),
  });

  return { id: eventId, acknowledged: true };
}

/**
 * Get security status overview metrics.
 */
export async function getSecurityOverview(uid) {
  const vault = await getOrCreatePrimaryVault(uid);

  // Active releases count
  const releasesSnap = await vaultsCollection.doc(vault.id).collection('releases').where('status', '==', 'active').get();
  
  // Pending emergency requests
  const emergencySnap = await vaultsCollection.doc(vault.id).collection('emergencyRequests').where('status', '==', 'pending').get();

  // Unacknowledged security alerts count
  const eventsSnap = await vaultsCollection.doc(vault.id).collection('securityEvents').where('acknowledged', '==', false).get();

  // Trusted people count
  const tpSnap = await vaultsCollection.doc(vault.id).collection('trustedPeople').where('status', '==', 'active').get();

  return {
    vaultId: vault.id,
    vaultStatus: 'protected',
    storageStatus: 'private',
    activeReleasesCount: releasesSnap.size,
    pendingEmergencyRequestsCount: emergencySnap.size,
    unacknowledgedAlertsCount: eventsSnap.size,
    activeTrustedPeopleCount: tpSnap.size,
    lastAuditTimestamp: new Date().toISOString(),
  };
}
