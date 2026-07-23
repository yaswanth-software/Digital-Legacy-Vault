import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logAuditEvent } from './trustedPersonService.js';
import { createNotification } from './notificationService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Helper to find all subdocuments in a given subcollection across all vaults matching a field filter.
 */
async function findSubdocuments(subcollectionName, fieldName, value) {
  const results = [];
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const snap = await vaultDoc.ref.collection(subcollectionName).where(fieldName, '==', value).get();
    snap.forEach(d => results.push(d.data()));
  }
  return results;
}

/**
 * Helper to find a specific subdocument snapshot by ID across all vaults.
 */
async function findSubdocumentById(subcollectionName, docId) {
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const docRef = vaultDoc.ref.collection(subcollectionName).doc(docId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap;
    }
  }
  return null;
}

/**
 * Automate triggering a Controlled Release from an approved/verified emergency request.
 */
export async function triggerReleaseFromRequest(vaultId, requestId) {
  try {
    const reqDoc = await vaultsCollection.doc(vaultId).collection('emergencyRequests').doc(requestId).get();
    if (!reqDoc.exists) return null;

    const request = reqDoc.data();

    // Find the trusted person to obtain their accessLevel
    const tpDoc = await vaultsCollection.doc(vaultId).collection('trustedPeople').doc(request.requesterTrustedPersonId).get();
    if (!tpDoc.exists) return null;

    const tp = tpDoc.data();

    // Create the release
    const release = await createRelease(vaultId, {
      recipientId: request.requesterId,
      trustedPersonId: tp.id,
      emergencyRequestId: requestId,
      ruleId: null,
      assetIds: request.requestedAssetIds,
      accessLevel: tp.role === 'legacy_executor' ? 'download' : 'view' // Derive based on role or config
    });

    // Update emergency request status to 'released'
    await reqDoc.ref.update({
      status: 'released',
      updatedAt: FieldValue.serverTimestamp()
    });

    return release;
  } catch (error) {
    console.error('Failed to trigger release from request:', error.message);
    return null;
  }
}

/**
 * Create a new Controlled Release.
 */
export async function createRelease(vaultId, data) {
  const { recipientId, trustedPersonId, emergencyRequestId, ruleId, assetIds, accessLevel } = data;

  const releaseRef = vaultsCollection.doc(vaultId).collection('releases').doc();
  const releaseId = releaseRef.id;

  const activatedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 72); // Default temporary access: 72 hours

  const newRelease = {
    id: releaseId,
    ownerId: (await vaultsCollection.doc(vaultId).get()).data().ownerId,
    vaultId,
    recipientId,
    trustedPersonId,
    ruleId: ruleId || null,
    emergencyRequestId: emergencyRequestId || null,
    assetIds,
    accessLevel: accessLevel || 'view',
    status: 'active',
    verificationId: '',
    createdAt: FieldValue.serverTimestamp(),
    activatedAt,
    expiresAt,
    revokedAt: null,
    revokedReason: null
  };

  await releaseRef.set(newRelease);

  // Notify recipient
  await createNotification(recipientId, {
    type: 'release_activated',
    title: 'Legacy Access Granted',
    message: `You have been granted temporary access to legacy assets. This access will expire in 72 hours.`,
    relatedVaultId: vaultId
  });

  // Log audit events
  await logAuditEvent(vaultId, newRelease.ownerId, recipientId, 'release_created', 'release', releaseId);
  await logAuditEvent(vaultId, newRelease.ownerId, recipientId, 'release_authorized', 'release', releaseId);
  await logAuditEvent(vaultId, newRelease.ownerId, recipientId, 'release_activated', 'release', releaseId);

  return newRelease;
}

/**
 * Get active & historical releases for a recipient.
 */
export async function getReleasesForRecipient(uid) {
  return findSubdocuments('releases', 'recipientId', uid);
}

/**
 * Get releases configured/triggered by a vault owner.
 */
export async function getReleasesForOwner(uid) {
  return findSubdocuments('releases', 'ownerId', uid);
}

/**
 * Get details of a release (owner or recipient).
 */
export async function getReleaseDetails(uid, id) {
  const releaseDoc = await findSubdocumentById('releases', id);
  if (!releaseDoc) {
    const error = new Error('Release record not found.');
    error.status = 404;
    throw error;
  }

  const release = releaseDoc.data();
  if (release.ownerId !== uid && release.recipientId !== uid) {
    const error = new Error('Unauthorized access to release details.');
    error.status = 403;
    throw error;
  }

  return release;
}

/**
 * Revoke an active release (Owner only).
 */
export async function revokeRelease(uid, id, reason) {
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    const error = new Error('A reason is required to revoke the release.');
    error.status = 400;
    throw error;
  }

  const releaseDoc = await findSubdocumentById('releases', id);
  if (!releaseDoc) {
    const error = new Error('Release record not found.');
    error.status = 404;
    throw error;
  }

  const release = releaseDoc.data();

  if (release.ownerId !== uid) {
    const error = new Error('Unauthorized. Only the vault owner can revoke this release.');
    error.status = 403;
    throw error;
  }

  await releaseDoc.ref.update({
    status: 'revoked',
    revokedAt: FieldValue.serverTimestamp(),
    revokedReason: reason.trim(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await logAuditEvent(release.vaultId, uid, uid, 'release_revoked', 'release', id);

  return { id, status: 'revoked', revokedReason: reason.trim() };
}

/**
 * Helper job to scan and expire old releases.
 */
export async function expireReleases() {
  const activeReleases = [];
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const snap = await vaultDoc.ref.collection('releases').where('status', '==', 'active').get();
    snap.forEach(d => activeReleases.push(d));
  }

  const now = new Date();
  let expiredCount = 0;

  for (const doc of activeReleases) {
    const release = doc.data();
    const expiresAt = release.expiresAt.toDate ? release.expiresAt.toDate() : new Date(release.expiresAt);
    
    if (expiresAt < now) {
      await doc.ref.update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp()
      });
      await logAuditEvent(release.vaultId, release.ownerId, 'system', 'release_expired', 'release', release.id);
      expiredCount++;
    }
  }

  return { expiredCount };
}

/**
 * Get audit logs/access logs for a specific release (Owner only).
 */
export async function getReleaseActivityLogs(uid, id) {
  const releaseDoc = await findSubdocumentById('releases', id);
  if (!releaseDoc) {
    const error = new Error('Release record not found.');
    error.status = 404;
    throw error;
  }

  const release = releaseDoc.data();
  if (release.ownerId !== uid) {
    const error = new Error('Unauthorized. Only the owner can view access activity logs.');
    error.status = 403;
    throw error;
  }

  const logsSnapshot = await vaultsCollection.doc(release.vaultId).collection('releaseAccessLogs')
    .where('releaseId', '==', id)
    .get();

  return logsSnapshot.docs.map(doc => doc.data());
}
