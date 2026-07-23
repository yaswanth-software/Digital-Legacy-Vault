import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import env from '../config/env.js';
import { sendInvitationEmail } from './emailService.js';
import { logAuditEvent, getTrustedPersonById } from './trustedPersonService.js';
import { getUserProfile } from './userService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Resend a pending or expired invitation by generating a new token and updating expiry.
 */
export async function resendInvitation(uid, ownerName, ownerEmail, vaultId, trustedPersonId) {
  const tp = await getTrustedPersonById(uid, vaultId, trustedPersonId);

  if (tp.removedAt) {
    const error = new Error('Cannot resend invitation for a removed trusted person.');
    error.status = 400;
    throw error;
  }

  if (tp.invitationStatus === 'accepted') {
    const error = new Error('This invitation has already been accepted.');
    error.status = 400;
    throw error;
  }

  if (tp.status === 'revoked' || tp.invitationStatus === 'revoked') {
    const error = new Error('Cannot resend a revoked invitation. Please add them again.');
    error.status = 400;
    throw error;
  }

  // Generate new cryptographic secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invitationExpiresAt = new Date(Date.now() + env.invitationExpiryDays * 24 * 60 * 60 * 1000);

  const tpRef = vaultsCollection.doc(vaultId).collection('trustedPeople').doc(trustedPersonId);
  await tpRef.update({
    invitationTokenHash: tokenHash,
    invitationExpiresAt,
    invitationStatus: 'pending',
    invitationSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Send invitation email
  const inviteUrl = await sendInvitationEmail({
    email: tp.email,
    fullName: tp.fullName,
    ownerName: ownerName || ownerEmail,
    relationship: tp.relationship === 'other' ? (tp.customRelationship || 'other') : tp.relationship,
    role: tp.role,
    rawToken,
    vaultId,
    trustedPersonId
  });

  // Log audit event
  await logAuditEvent(vaultId, uid, uid, 'invitation_resent', 'trusted_person', trustedPersonId);

  const responseData = { id: trustedPersonId, resent: true };
  if (env.isDevelopment()) {
    responseData._devInvitationUrl = inviteUrl;
  }

  return responseData;
}

/**
 * Public preview of an invitation before logging in/registering.
 * Verifies invitation validity and retrieves inviter details.
 */
export async function previewInvitation(rawToken, vaultId, trustedPersonId) {
  if (!rawToken || typeof rawToken !== 'string') {
    const error = new Error('Invitation token is required.');
    error.status = 400;
    throw error;
  }

  if (!vaultId || !trustedPersonId) {
    const error = new Error('Invalid invitation link parameters.');
    error.status = 400;
    throw error;
  }

  const tpDoc = await vaultsCollection
    .doc(vaultId)
    .collection('trustedPeople')
    .doc(trustedPersonId)
    .get();

  if (!tpDoc.exists) {
    const error = new Error('This invitation is no longer valid.');
    error.status = 404;
    throw error;
  }

  const tp = tpDoc.data();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Verify token hash match
  if (tp.invitationTokenHash !== tokenHash) {
    const error = new Error('This invitation token is invalid or has expired.');
    error.status = 400;
    throw error;
  }

  // If status is revoked or removed, fail immediately
  if (tp.status === 'revoked' || tp.invitationStatus === 'revoked' || tp.removedAt) {
    const error = new Error('This invitation has been revoked or is no longer valid.');
    error.status = 400;
    throw error;
  }

  if (tp.invitationStatus === 'accepted') {
    const error = new Error('This invitation has already been accepted.');
    error.status = 400;
    throw error;
  }

  // Expiry check
  const expiresAt = tp.invitationExpiresAt.toDate();
  if (expiresAt < new Date()) {
    // Soft update invitation status to expired in database
    await tpDoc.ref.update({
      invitationStatus: 'expired',
      updatedAt: FieldValue.serverTimestamp()
    });
    const error = new Error('This invitation has expired.');
    error.status = 400;
    throw error;
  }

  // Get owner (inviter) profile
  const inviterProfile = await getUserProfile(tp.ownerId);
  const inviterName = inviterProfile ? (inviterProfile.displayName || inviterProfile.email) : 'A LegacyOS User';

  return {
    inviterName,
    relationship: tp.relationship === 'other' ? (tp.customRelationship || 'other') : tp.relationship,
    role: tp.role,
    email: tp.email, // target email of invitee
    status: tp.status
  };
}

/**
 * Accept invitation and link trusted person with authenticated user's Firebase UID.
 */
export async function acceptInvitation(uid, userEmail, rawToken, vaultId, trustedPersonId) {
  if (!rawToken || typeof rawToken !== 'string') {
    const error = new Error('Invitation token is required.');
    error.status = 400;
    throw error;
  }

  if (!vaultId || !trustedPersonId) {
    const error = new Error('Invalid invitation link parameters.');
    error.status = 400;
    throw error;
  }

  const tpDoc = await vaultsCollection
    .doc(vaultId)
    .collection('trustedPeople')
    .doc(trustedPersonId)
    .get();

  if (!tpDoc.exists) {
    const error = new Error('This invitation is no longer valid.');
    error.status = 404;
    throw error;
  }

  const tp = tpDoc.data();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Verify token hash match
  if (tp.invitationTokenHash !== tokenHash) {
    const error = new Error('This invitation token is invalid or has expired.');
    error.status = 400;
    throw error;
  }

  if (tp.status === 'revoked' || tp.invitationStatus === 'revoked' || tp.removedAt) {
    const error = new Error('This invitation has been revoked by the owner.');
    error.status = 400;
    throw error;
  }

  if (tp.invitationStatus === 'accepted') {
    const error = new Error('This invitation has already been accepted.');
    error.status = 400;
    throw error;
  }

  // Check email identity
  if (userEmail.toLowerCase().trim() !== tp.email.toLowerCase().trim()) {
    const error = new Error('This invitation was sent to a different email address.');
    error.status = 400;
    throw error;
  }

  // Check expiration
  const expiresAt = tp.invitationExpiresAt.toDate();
  if (expiresAt < new Date()) {
    await tpDoc.ref.update({
      invitationStatus: 'expired',
      updatedAt: FieldValue.serverTimestamp()
    });
    const error = new Error('This invitation has expired.');
    error.status = 400;
    throw error;
  }

  // Link identity
  await tpDoc.ref.update({
    acceptedUserId: uid,
    invitationStatus: 'accepted',
    status: 'active',
    invitationAcceptedAt: FieldValue.serverTimestamp(),
    invitationTokenHash: null, // clear token hash on acceptance
    invitationExpiresAt: null,
    updatedAt: FieldValue.serverTimestamp()
  });

  // Log audit event under the vault
  await logAuditEvent(tp.vaultId, tp.ownerId, uid, 'invitation_accepted', 'trusted_person', tp.id);

  return { id: tp.id, accepted: true };
}
