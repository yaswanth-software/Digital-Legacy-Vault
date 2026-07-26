import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import env from '../config/env.js';
import { sendInvitationEmail } from './emailService.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const getVaultsCollection = () => {
  if (!firestoreAdmin) {
    const err = new Error('Database service is unavailable. Please set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables.');
    err.status = 503;
    throw err;
  }
  return firestoreAdmin.collection('vaults');
};

// Presets validation lists
const RELATIONSHIPS = [
  'family', 'spouse', 'parent', 'child', 'sibling', 'relative',
  'friend', 'partner', 'lawyer', 'financial_advisor', 'executor', 'other'
];

const ROLES = [
  'legacy_recipient', 'legacy_executor', 'legal_advisor',
  'financial_advisor', 'emergency_contact', 'family_member', 'other'
];

/**
 * Log an audit event under a vault.
 */
export async function logAuditEvent(vaultId, ownerId, actorId, action, targetType, targetId) {
  try {
    const logRef = getVaultsCollection().doc(vaultId).collection('auditLogs').doc();
    await logRef.set({
      id: logRef.id,
      ownerId,
      vaultId,
      actorId,
      action,
      targetType,
      targetId,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit event:', error.message);
  }
}

/**
 * Validate input fields.
 */
export function validateTrustedPersonInput(data) {
  const errors = [];

  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    errors.push('Full Name is required and must be at least 2 characters.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!RELATIONSHIPS.includes(data.relationship)) {
    errors.push(`Relationship must be one of: ${RELATIONSHIPS.join(', ')}`);
  }

  if (!ROLES.includes(data.role)) {
    errors.push(`Role must be one of: ${ROLES.join(', ')}`);
  }

  return errors;
}

/**
 * Verify vault ownership.
 */
async function verifyVaultOwnership(uid, vaultId) {
  const vaultDoc = await getVaultsCollection().doc(vaultId).get();
  if (!vaultDoc.exists) {
    const error = new Error('Vault not found.');
    error.status = 404;
    throw error;
  }
  const vault = vaultDoc.data();
  if (vault.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not have permission to manage this vault.');
    error.status = 403;
    throw error;
  }
  return vault;
}

/**
 * Create a new trusted person, generate a secure accept token, and send an invitation.
 */
export async function createTrustedPerson(uid, ownerEmail, ownerName, vaultId, data) {
  const vault = await verifyVaultOwnership(uid, vaultId);

  const errors = validateTrustedPersonInput(data);
  if (errors.length > 0) {
    const err = new Error(errors[0]);
    err.status = 400;
    throw err;
  }

  const email = data.email.toLowerCase().trim();

  // Guard: Cannot invite yourself
  if (email === ownerEmail.toLowerCase().trim()) {
    const err = new Error('You cannot add yourself as a trusted person.');
    err.status = 400;
    throw err;
  }

  const trustedPeopleRef = getVaultsCollection().doc(vaultId).collection('trustedPeople');

  // Check duplicate active or pending trusted person with this email
  const duplicateQuery = await trustedPeopleRef
    .where('email', '==', email)
    .get();

  const activeDuplicates = duplicateQuery.docs.filter(doc => {
    const tp = doc.data();
    return !tp.removedAt && tp.status !== 'revoked' && tp.invitationStatus !== 'revoked';
  });

  if (activeDuplicates.length > 0) {
    const err = new Error('This person is already added to your Trusted People.');
    err.status = 400;
    throw err;
  }

  // Generate cryptographic secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invitationExpiresAt = new Date(Date.now() + env.invitationExpiryDays * 24 * 60 * 60 * 1000);

  const newTrustedPersonRef = trustedPeopleRef.doc();
  const trustedPersonId = newTrustedPersonRef.id;

  const newTrustedPerson = {
    id: trustedPersonId,
    ownerId: uid,
    vaultId,
    fullName: data.fullName.trim(),
    email,
    phone: (data.phone || '').trim(),
    relationship: data.relationship,
    customRelationship: data.relationship === 'other' ? (data.customRelationship || '').trim() : null,
    role: data.role,
    status: 'active', // active, inactive, revoked
    invitationStatus: 'pending', // pending, accepted, declined, expired, revoked
    invitationTokenHash: tokenHash,
    invitationExpiresAt: invitationExpiresAt,
    invitationSentAt: FieldValue.serverTimestamp(),
    invitationAcceptedAt: null,
    acceptedUserId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await newTrustedPersonRef.set(newTrustedPerson);

  // Send invitation email
  const inviteUrl = await sendInvitationEmail({
    email,
    fullName: data.fullName.trim(),
    ownerName: ownerName || ownerEmail,
    relationship: data.relationship === 'other' ? (data.customRelationship || 'other') : data.relationship,
    role: data.role,
    rawToken,
    vaultId,
    trustedPersonId
  });

  // Log audit events
  await logAuditEvent(vaultId, uid, uid, 'trusted_person_added', 'trusted_person', trustedPersonId);
  await logAuditEvent(vaultId, uid, uid, 'invitation_sent', 'trusted_person', trustedPersonId);

  // Include raw token in development response for easy testing
  const responseData = { ...newTrustedPerson };
  if (env.isDevelopment()) {
    responseData._devInvitationUrl = inviteUrl;
  }

  return responseData;
}

/**
 * Retrieve all trusted people for a vault, filtering out soft-removed by default.
 */
export async function getTrustedPeople(uid, vaultId, queryParams = {}) {
  await verifyVaultOwnership(uid, vaultId);

  const trustedPeopleRef = getVaultsCollection().doc(vaultId).collection('trustedPeople');
  const snapshot = await trustedPeopleRef.get();
  let list = snapshot.docs.map(doc => doc.data());

  // Filter out soft removed by default
  const showRemoved = queryParams.showRemoved === 'true';
  if (!showRemoved) {
    list = list.filter(tp => !tp.removedAt);
  }

  return list;
}

/**
 * Fetch a single trusted person details.
 */
export async function getTrustedPersonById(uid, vaultId, trustedPersonId) {
  await verifyVaultOwnership(uid, vaultId);

  const tpDoc = await getVaultsCollection().doc(vaultId).collection('trustedPeople').doc(trustedPersonId).get();
  if (!tpDoc.exists) {
    const error = new Error('Trusted person not found.');
    error.status = 404;
    throw error;
  }

  const tp = tpDoc.data();
  if (tp.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not have permission to manage this trusted person.');
    error.status = 403;
    throw error;
  }

  return tp;
}

/**
 * Update trusted person information.
 */
export async function updateTrustedPerson(uid, ownerName, ownerEmail, vaultId, trustedPersonId, updateData) {
  const tp = await getTrustedPersonById(uid, vaultId, trustedPersonId);

  if (tp.removedAt) {
    const error = new Error('Cannot edit a removed trusted person.');
    error.status = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const newEmail = updateData.email?.toLowerCase().trim();

  // If email changes, check duplicate & token replacement constraints
  const emailChanged = newEmail && newEmail !== tp.email;
  if (emailChanged) {
    if (tp.invitationStatus === 'accepted') {
      const error = new Error('Email address cannot be modified after invitation has been accepted.');
      error.status = 400;
      throw error;
    }
    if (!emailRegex.test(newEmail)) {
      const error = new Error('A valid email address is required.');
      error.status = 400;
      throw error;
    }
    if (newEmail === ownerEmail.toLowerCase().trim()) {
      const error = new Error('You cannot add yourself as a trusted person.');
      error.status = 400;
      throw error;
    }

    // Check duplicate
    const duplicateQuery = await getVaultsCollection().doc(vaultId).collection('trustedPeople')
      .where('email', '==', newEmail)
      .get();

    const activeDuplicates = duplicateQuery.docs.filter(doc => {
      const t = doc.data();
      return t.id !== trustedPersonId && !t.removedAt && t.status !== 'revoked';
    });

    if (activeDuplicates.length > 0) {
      const error = new Error('This email belongs to another active trusted person.');
      error.status = 400;
      throw error;
    }
  }

  const allowedUpdates = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updateData.fullName !== undefined) {
    if (updateData.fullName.trim().length < 2) {
      const error = new Error('Full Name must be at least 2 characters.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.fullName = updateData.fullName.trim();
  }

  if (updateData.phone !== undefined) {
    allowedUpdates.phone = (updateData.phone || '').trim();
  }

  if (updateData.relationship !== undefined) {
    if (!RELATIONSHIPS.includes(updateData.relationship)) {
      const error = new Error('Invalid relationship.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.relationship = updateData.relationship;
    allowedUpdates.customRelationship = updateData.relationship === 'other' ? (updateData.customRelationship || '').trim() : null;
  }

  if (updateData.role !== undefined) {
    if (!ROLES.includes(updateData.role)) {
      const error = new Error('Invalid role.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.role = updateData.role;
  }

  let devInvitationUrl = null;

  if (emailChanged) {
    allowedUpdates.email = newEmail;
    // Generate new token, invalidate old one
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invitationExpiresAt = new Date(Date.now() + env.invitationExpiryDays * 24 * 60 * 60 * 1000);

    allowedUpdates.invitationTokenHash = tokenHash;
    allowedUpdates.invitationExpiresAt = invitationExpiresAt;
    allowedUpdates.invitationStatus = 'pending';
    allowedUpdates.invitationSentAt = FieldValue.serverTimestamp();

    // Send new invitation email
    const inviteUrl = await sendInvitationEmail({
      email: newEmail,
      fullName: allowedUpdates.fullName || tp.fullName,
      ownerName: ownerName || ownerEmail,
      relationship: allowedUpdates.relationship === 'other' ? (allowedUpdates.customRelationship || 'other') : (allowedUpdates.relationship || tp.relationship),
      role: allowedUpdates.role || tp.role,
      rawToken,
      vaultId,
      trustedPersonId: tp.id
    });

    if (env.isDevelopment()) {
      devInvitationUrl = inviteUrl;
    }

    await logAuditEvent(vaultId, uid, uid, 'invitation_sent', 'trusted_person', trustedPersonId);
  }

  const tpRef = getVaultsCollection().doc(vaultId).collection('trustedPeople').doc(trustedPersonId);
  await tpRef.update(allowedUpdates);

  const updatedDoc = await tpRef.get();
  const responseData = updatedDoc.data();
  if (devInvitationUrl) {
    responseData._devInvitationUrl = devInvitationUrl;
  }

  return responseData;
}

/**
 * Revoke trust and remove permissions.
 */
export async function revokeTrustedPerson(uid, vaultId, trustedPersonId) {
  const tp = await getTrustedPersonById(uid, vaultId, trustedPersonId);

  const tpRef = getVaultsCollection().doc(vaultId).collection('trustedPeople').doc(trustedPersonId);
  await tpRef.update({
    status: 'revoked',
    invitationStatus: 'revoked',
    invitationTokenHash: null,
    invitationExpiresAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Revoke all access permissions
  const permissionsRef = getVaultsCollection().doc(vaultId).collection('accessPermissions');
  const snapshot = await permissionsRef.where('trustedPersonId', '==', trustedPersonId).get();
  
  const batch = firestoreAdmin.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref); // Delete permissions completely on revocation
  });
  await batch.commit();

  await logAuditEvent(vaultId, uid, uid, 'trusted_person_revoked', 'trusted_person', trustedPersonId);

  return { id: trustedPersonId, revoked: true };
}

/**
 * Soft-delete trusted person from lists.
 */
export async function softRemoveTrustedPerson(uid, vaultId, trustedPersonId) {
  const tp = await getTrustedPersonById(uid, vaultId, trustedPersonId);

  const tpRef = getVaultsCollection().doc(vaultId).collection('trustedPeople').doc(trustedPersonId);
  await tpRef.update({
    status: 'revoked',
    invitationStatus: 'revoked',
    invitationTokenHash: null,
    invitationExpiresAt: null,
    removedAt: FieldValue.serverTimestamp(),
    removedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Revoke access permissions
  const permissionsRef = getVaultsCollection().doc(vaultId).collection('accessPermissions');
  const snapshot = await permissionsRef.where('trustedPersonId', '==', trustedPersonId).get();
  
  const batch = firestoreAdmin.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  await logAuditEvent(vaultId, uid, uid, 'trusted_person_removed', 'trusted_person', trustedPersonId);

  return { id: trustedPersonId, removed: true };
}
