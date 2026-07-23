import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logAuditEvent } from './trustedPersonService.js';
import { createNotification } from './notificationService.js';
import { createVerification } from './verificationService.js';

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
 * Get all assets available to the trusted person for emergency access requests.
 */
export async function getAvailableAssets(uid) {
  const tps = await findSubdocuments('trustedPeople', 'acceptedUserId', uid);

  const activeTPs = tps.filter(tp => !tp.removedAt && tp.invitationStatus === 'accepted' && tp.status === 'active');

  const availableAssets = [];

  for (const tp of activeTPs) {
    const permissionsSnapshot = await vaultsCollection
      .doc(tp.vaultId)
      .collection('accessPermissions')
      .where('trustedPersonId', '==', tp.id)
      .get();

    const permissions = permissionsSnapshot.docs
      .map(doc => doc.data())
      .filter(p => p.emergencyAccessEnabled === true && p.accessLevel !== 'no_access');

    for (const p of permissions) {
      const assetDoc = await vaultsCollection
        .doc(tp.vaultId)
        .collection('assets')
        .doc(p.assetId)
        .get();

      if (assetDoc.exists) {
        const asset = assetDoc.data();
        if (asset.status === 'active') {
          availableAssets.push({
            assetId: asset.id,
            assetName: asset.name,
            category: asset.category,
            assetType: asset.assetType,
            priority: asset.priority || 'medium',
            vaultId: tp.vaultId,
            ownerId: tp.ownerId,
            trustedPersonId: tp.id,
            accessLevel: p.accessLevel,
            emergencyVerificationLevel: p.emergencyVerificationLevel || 'high',
          });
        }
      }
    }
  }

  return availableAssets;
}

/**
 * Submit a new emergency access request.
 */
export async function createEmergencyRequest(uid, data) {
  const { reason, priority, vaultId, requestedAssetIds } = data;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 20 || reason.trim().length > 1000) {
    const error = new Error('Reason is required and must be between 20 and 1000 characters.');
    error.status = 400;
    throw error;
  }

  if (!priority || !['normal', 'high', 'critical'].includes(priority)) {
    const error = new Error('Priority must be normal, high, or critical.');
    error.status = 400;
    throw error;
  }

  if (!vaultId) {
    const error = new Error('vaultId is required.');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(requestedAssetIds) || requestedAssetIds.length === 0) {
    const error = new Error('At least one requested asset ID must be selected.');
    error.status = 400;
    throw error;
  }

  // 1. Verify trusted relationship
  const tpSnapshot = await vaultsCollection.doc(vaultId).collection('trustedPeople')
    .where('acceptedUserId', '==', uid)
    .get();

  const activeTP = tpSnapshot.docs
    .map(doc => doc.data())
    .find(tp => !tp.removedAt && tp.invitationStatus === 'accepted' && tp.status === 'active');

  if (!activeTP) {
    const error = new Error('Unauthorized. You are not an active trusted person for this vault.');
    error.status = 403;
    throw error;
  }

  // 2. Fetch configured permissions for requested assets and verify eligibility
  const permissionsSnapshot = await vaultsCollection.doc(vaultId).collection('accessPermissions')
    .where('trustedPersonId', '==', activeTP.id)
    .get();

  const permissions = permissionsSnapshot.docs.map(doc => doc.data());
  const requestedPermissions = [];
  let highestVerificationLevel = 'basic';

  for (const assetId of requestedAssetIds) {
    const perm = permissions.find(p => p.assetId === assetId);
    if (!perm || !perm.emergencyAccessEnabled || perm.accessLevel === 'no_access') {
      const error = new Error('Access denied. One or more requested assets are not available for emergency access.');
      error.status = 403;
      throw error;
    }

    // Verify asset is not archived
    const assetDoc = await vaultsCollection.doc(vaultId).collection('assets').doc(assetId).get();
    if (!assetDoc.exists || assetDoc.data().status === 'archived') {
      const error = new Error('Access denied. One or more requested assets are currently archived/unavailable.');
      error.status = 400;
      throw error;
    }

    requestedPermissions.push(perm);

    const level = perm.emergencyVerificationLevel || 'high';
    if (level === 'high') {
      highestVerificationLevel = 'high';
    } else if (level === 'standard' && highestVerificationLevel !== 'high') {
      highestVerificationLevel = 'standard';
    }
  }

  // 3. Prevent auto-approval of high-risk assets
  // If the requester requests critical assets, enforce high verification
  const assetsQuery = await vaultsCollection.doc(vaultId).collection('assets').get();
  const allAssets = assetsQuery.docs.map(doc => doc.data());
  const requestedAssets = allAssets.filter(a => requestedAssetIds.includes(a.id));
  const hasCriticalAssets = requestedAssets.some(a => a.priority === 'critical' || a.priority === 'high');

  if (hasCriticalAssets) {
    highestVerificationLevel = 'high';
  }

  // 4. Create Emergency Request document
  const reqRef = vaultsCollection.doc(vaultId).collection('emergencyRequests').doc();
  const requestId = reqRef.id;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const emergencyRequest = {
    id: requestId,
    ownerId: activeTP.ownerId,
    vaultId,
    requesterId: uid,
    requesterTrustedPersonId: activeTP.id,
    reason: reason.trim(),
    requestedAssetIds,
    status: 'pending',
    priority,
    verificationLevel: highestVerificationLevel,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt,
    reviewedAt: null,
    reviewedBy: null
  };

  await reqRef.set(emergencyRequest);

  // 5. Create associated Verification tracker
  const verification = await createVerification(vaultId, activeTP.ownerId, {
    emergencyRequestId: requestId,
    requesterId: uid,
    verificationLevel: highestVerificationLevel
  });

  // Update emergency request with status 'verification_required' if verification level demands it
  if (highestVerificationLevel !== 'basic') {
    await reqRef.update({
      status: 'verification_required',
      updatedAt: FieldValue.serverTimestamp()
    });
    emergencyRequest.status = 'verification_required';
  }

  // 6. Notify vault owner
  await createNotification(activeTP.ownerId, {
    type: 'emergency_request_submitted',
    title: 'Emergency Access Requested',
    message: `${activeTP.fullName} has requested emergency access to legacy assets. Reason: "${reason.substring(0, 50)}..."`,
    relatedVaultId: vaultId
  });

  // 7. Log audit event
  await logAuditEvent(vaultId, activeTP.ownerId, uid, 'emergency_request_created', 'emergency_request', requestId);

  return { emergencyRequest, verification };
}

/**
 * Get all requests submitted by the logged-in user.
 */
export async function getRequestsSubmittedBy(uid) {
  return findSubdocuments('emergencyRequests', 'requesterId', uid);
}

/**
 * Get all incoming requests for the owner's vaults.
 */
export async function getIncomingRequests(uid) {
  return findSubdocuments('emergencyRequests', 'ownerId', uid);
}

/**
 * Fetch a single emergency request, verifying permission to view it.
 */
export async function getRequestDetails(uid, requestId) {
  const requestDoc = await findSubdocumentById('emergencyRequests', requestId);
  if (!requestDoc) {
    const error = new Error('Emergency request not found.');
    error.status = 404;
    throw error;
  }

  const request = requestDoc.data();
  if (request.ownerId !== uid && request.requesterId !== uid) {
    const error = new Error('Unauthorized access to request details.');
    error.status = 403;
    throw error;
  }

  return request;
}

/**
 * Approve an emergency access request (Owner only).
 */
export async function approveRequest(uid, requestId) {
  const requestDoc = await findSubdocumentById('emergencyRequests', requestId);
  if (!requestDoc) {
    const error = new Error('Emergency request not found.');
    error.status = 404;
    throw error;
  }

  const request = requestDoc.data();

  if (request.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this vault.');
    error.status = 403;
    throw error;
  }

  if (request.status !== 'pending' && request.status !== 'verification_required' && request.status !== 'under_review') {
    const error = new Error(`Request has already been processed with status: ${request.status}`);
    error.status = 400;
    throw error;
  }

  // Update request status
  await requestDoc.ref.update({
    status: 'approved',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: uid,
    updatedAt: FieldValue.serverTimestamp()
  });

  // Update matching verification - satisfy "owner_notification" and "security_review" steps
  const verDoc = await findSubdocumentById('verifications', request.id); // Wait, verifications might share the same ID if created that way, but let's query it by emergencyRequestId!
  
  const verDocs = [];
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const snap = await vaultDoc.ref.collection('verifications').where('emergencyRequestId', '==', requestId).limit(1).get();
    snap.forEach(d => verDocs.push(d));
  }

  if (verDocs.length > 0) {
    const vDoc = verDocs[0];
    const verData = vDoc.data();
    
    const updatedSteps = { ...verData.steps };
    if (updatedSteps.owner_notification) updatedSteps.owner_notification.status = 'completed';
    if (updatedSteps.security_review) updatedSteps.security_review.status = 'completed';

    await vDoc.ref.update({
      steps: updatedSteps,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Auto-complete the verification if all required steps are complete
    const pendingSteps = Object.keys(updatedSteps).filter(key => updatedSteps[key].required && updatedSteps[key].status !== 'completed');
    if (pendingSteps.length === 0) {
      await vDoc.ref.update({
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Import release authorization to trigger release
      const { triggerReleaseFromRequest } = await import('./controlledReleaseService.js');
      await triggerReleaseFromRequest(request.vaultId, request.id);
    }
  }

  await logAuditEvent(request.vaultId, uid, uid, 'emergency_request_approved', 'emergency_request', requestId);

  return { id: requestId, status: 'approved' };
}

/**
 * Deny an emergency access request (Owner only).
 */
export async function denyRequest(uid, requestId) {
  const requestDoc = await findSubdocumentById('emergencyRequests', requestId);
  if (!requestDoc) {
    const error = new Error('Emergency request not found.');
    error.status = 404;
    throw error;
  }

  const request = requestDoc.data();

  if (request.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this vault.');
    error.status = 403;
    throw error;
  }

  if (request.status !== 'pending' && request.status !== 'verification_required' && request.status !== 'under_review') {
    const error = new Error(`Request has already been processed with status: ${request.status}`);
    error.status = 400;
    throw error;
  }

  await requestDoc.ref.update({
    status: 'denied',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: uid,
    updatedAt: FieldValue.serverTimestamp()
  });

  // Cancel associated verification
  const verDocs = [];
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const snap = await vaultDoc.ref.collection('verifications').where('emergencyRequestId', '==', requestId).limit(1).get();
    snap.forEach(d => verDocs.push(d));
  }

  if (verDocs.length > 0) {
    await verDocs[0].ref.update({
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  await logAuditEvent(request.vaultId, uid, uid, 'emergency_request_denied', 'emergency_request', requestId);

  return { id: requestId, status: 'denied' };
}

/**
 * Escalates or requests more/custom verification (Owner only).
 */
export async function requestVerification(uid, requestId, level = 'high') {
  const requestDoc = await findSubdocumentById('emergencyRequests', requestId);
  if (!requestDoc) {
    const error = new Error('Emergency request not found.');
    error.status = 404;
    throw error;
  }

  const request = requestDoc.data();

  if (request.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this vault.');
    error.status = 403;
    throw error;
  }

  await requestDoc.ref.update({
    status: 'verification_required',
    verificationLevel: level,
    updatedAt: FieldValue.serverTimestamp()
  });

  // Update associated verification structure
  const verDocs = [];
  const vaults = await vaultsCollection.get();
  for (const vaultDoc of vaults.docs) {
    const snap = await vaultDoc.ref.collection('verifications').where('emergencyRequestId', '==', requestId).limit(1).get();
    snap.forEach(d => verDocs.push(d));
  }

  if (verDocs.length > 0) {
    const vDoc = verDocs[0];
    const verData = vDoc.data();
    const updatedSteps = { ...verData.steps };

    if (level === 'high' || level === 'standard') {
      updatedSteps.trusted_person_confirmation = { status: 'pending', required: true };
    }
    if (level === 'high') {
      updatedSteps.security_review = { status: 'pending', required: true };
    }

    await vDoc.ref.update({
      steps: updatedSteps,
      status: 'in_progress',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  await logAuditEvent(request.vaultId, uid, uid, 'verification_started', 'emergency_request', requestId);

  return { id: requestId, status: 'verification_required' };
}
