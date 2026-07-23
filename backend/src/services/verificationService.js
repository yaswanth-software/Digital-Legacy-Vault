import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

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
 * Initialize a new multi-step verification tracker.
 */
export async function createVerification(vaultId, ownerId, data) {
  const { emergencyRequestId, requesterId, verificationLevel } = data;

  const verRef = vaultsCollection.doc(vaultId).collection('verifications').doc();
  const verificationId = verRef.id;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Set up steps depending on verification level
  const steps = {
    identity: { status: 'pending', required: true },
    owner_notification: { status: 'pending', required: true }
  };

  if (verificationLevel === 'standard' || verificationLevel === 'high') {
    steps.trusted_person_confirmation = { status: 'pending', required: true };
  }
  if (verificationLevel === 'high') {
    steps.security_review = { status: 'pending', required: true };
  }

  const newVerification = {
    id: verificationId,
    ownerId,
    vaultId,
    ruleId: null, // set if triggered by legacy rule engine
    emergencyRequestId: emergencyRequestId || null,
    requesterId,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    steps,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    completedAt: null
  };

  await verRef.set(newVerification);
  await logAuditEvent(vaultId, ownerId, requesterId, 'verification_started', 'verification', verificationId);

  return newVerification;
}

/**
 * Retrieve verification details by ID (requester or owner only).
 */
export async function getVerificationDetails(uid, id) {
  const verDoc = await findSubdocumentById('verifications', id);
  if (!verDoc) {
    const error = new Error('Verification record not found.');
    error.status = 404;
    throw error;
  }

  const ver = verDoc.data();

  if (ver.ownerId !== uid && ver.requesterId !== uid) {
    const error = new Error('Unauthorized access to verification details.');
    error.status = 403;
    throw error;
  }

  return ver;
}

/**
 * Handle completing a step in the verification workflow (e.g. Identity check).
 */
export async function completeVerificationStep(uid, id, stepName) {
  const verDoc = await findSubdocumentById('verifications', id);
  if (!verDoc) {
    const error = new Error('Verification record not found.');
    error.status = 404;
    throw error;
  }

  const ver = verDoc.data();

  if (ver.status === 'completed' || ver.status === 'failed' || ver.status === 'expired' || ver.status === 'cancelled') {
    const error = new Error(`Verification is already in a final state: ${ver.status}`);
    error.status = 400;
    throw error;
  }

  const expiresAt = ver.expiresAt.toDate ? ver.expiresAt.toDate() : new Date(ver.expiresAt);
  if (expiresAt < new Date()) {
    await verDoc.ref.update({ status: 'expired', updatedAt: FieldValue.serverTimestamp() });
    const error = new Error('Verification workflow has expired.');
    error.status = 400;
    throw error;
  }

  if (ver.attempts >= ver.maxAttempts) {
    await verDoc.ref.update({ status: 'failed', updatedAt: FieldValue.serverTimestamp() });
    const error = new Error('Too many verification attempts failed. Access blocked.');
    error.status = 400;
    throw error;
  }

  // 1. Step validation
  if (!ver.steps[stepName]) {
    const error = new Error(`Invalid verification step: ${stepName}`);
    error.status = 400;
    throw error;
  }

  let stepSuccess = false;

  if (stepName === 'identity') {
    // Identity verification checks that logged in Firebase UID matches the requester identity key
    if (uid === ver.requesterId) {
      stepSuccess = true;
    }
  }

  // 2. Increment attempts
  const nextAttempts = ver.attempts + 1;
  const updates = {
    attempts: nextAttempts,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (stepSuccess) {
    const updatedSteps = { ...ver.steps };
    updatedSteps[stepName].status = 'completed';
    updates.steps = updatedSteps;

    // Check if all required steps are complete
    const pendingRequired = Object.keys(updatedSteps).filter(key => updatedSteps[key].required && updatedSteps[key].status !== 'completed');
    
    if (pendingRequired.length === 0) {
      updates.status = 'completed';
      updates.completedAt = FieldValue.serverTimestamp();
    } else {
      updates.status = 'in_progress';
    }

    await verDoc.ref.update(updates);
    await logAuditEvent(ver.vaultId, ver.ownerId, uid, 'verification_completed', 'verification_step', `${id}_${stepName}`);

    // If fully completed, trigger the release engine!
    if (pendingRequired.length === 0) {
      const { triggerReleaseFromRequest } = await import('./controlledReleaseService.js');
      await triggerReleaseFromRequest(ver.vaultId, ver.emergencyRequestId);
    }
  } else {
    // Failed attempt
    if (nextAttempts >= ver.maxAttempts) {
      updates.status = 'failed';
      await logAuditEvent(ver.vaultId, ver.ownerId, uid, 'verification_failed', 'verification', id);
    }
    await verDoc.ref.update(updates);
    
    const error = new Error('Verification step failed.');
    error.status = 400;
    throw error;
  }

  const updatedDoc = await verDoc.ref.get();
  return updatedDoc.data();
}

/**
 * Cancel/Revoke a verification workflow.
 */
export async function cancelVerification(uid, id) {
  const verDoc = await findSubdocumentById('verifications', id);
  if (!verDoc) {
    const error = new Error('Verification record not found.');
    error.status = 404;
    throw error;
  }

  const ver = verDoc.data();

  if (ver.ownerId !== uid && ver.requesterId !== uid) {
    const error = new Error('Unauthorized to cancel this verification workflow.');
    error.status = 403;
    throw error;
  }

  await verDoc.ref.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp()
  });

  return { id, status: 'cancelled' };
}
