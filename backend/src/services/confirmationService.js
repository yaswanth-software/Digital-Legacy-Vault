import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { evaluateRule } from './legacyRuleEngine.js';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;
const usersCollection = firestoreAdmin ? firestoreAdmin.collection('users') : null;

/**
 * Helper to retrieve the trusted person document and verify identity matching.
 */
async function verifyTrustedPersonMatch(uid, vaultId, trustedPersonId) {
  const tpDoc = await vaultsCollection
    .doc(vaultId)
    .collection('trustedPeople')
    .doc(trustedPersonId)
    .get();

  if (!tpDoc.exists) {
    const error = new Error('Associated trusted person record not found.');
    error.status = 404;
    throw error;
  }

  const tp = tpDoc.data();
  if (tp.acceptedUserId !== uid) {
    const error = new Error('Unauthorized. You are not the designated recipient of this request.');
    error.status = 403;
    throw error;
  }

  return tp;
}

/**
 * Fetch all confirmations requested from the authenticated trusted user.
 * Scans notifications of type 'trusted_person_confirmation_requested' to bypass collection group indexes.
 */
export async function getConfirmations(uid) {
  const notifsSnapshot = await usersCollection
    .doc(uid)
    .collection('notifications')
    .where('type', '==', 'trusted_person_confirmation_requested')
    .get();

  const notifs = notifsSnapshot.docs.map(doc => doc.data());
  const list = [];

  for (const n of notifs) {
    if (n.relatedVaultId && n.confirmationId) {
      try {
        const confDoc = await vaultsCollection
          .doc(n.relatedVaultId)
          .collection('confirmations')
          .doc(n.confirmationId)
          .get();

        if (confDoc.exists) {
          const conf = confDoc.data();
          // Verify that user matches
          const tpDoc = await vaultsCollection
            .doc(n.relatedVaultId)
            .collection('trustedPeople')
            .doc(conf.trustedPersonId)
            .get();
          
          if (tpDoc.exists && tpDoc.data().acceptedUserId === uid) {
            list.push(conf);
          }
        }
      } catch (err) {
        console.warn('Failed to point query confirmation details for notification:', n.id);
      }
    }
  }

  return list;
}

/**
 * Fetch a single confirmation request by point lookup.
 */
export async function getConfirmationById(uid, vaultId, confirmationId) {
  const confRef = vaultsCollection.doc(vaultId).collection('confirmations').doc(confirmationId);
  const confDoc = await confRef.get();

  if (!confDoc.exists) {
    const error = new Error('Confirmation request not found.');
    error.status = 404;
    throw error;
  }

  const conf = confDoc.data();
  // Verify matching accepted user identity
  await verifyTrustedPersonMatch(uid, vaultId, conf.trustedPersonId);

  return conf;
}

/**
 * Respond (Confirm or Decline) to a confirmation request.
 */
export async function respondToConfirmation(uid, vaultId, confirmationId, responseStatus) {
  if (!['confirmed', 'declined'].includes(responseStatus)) {
    const error = new Error('Response status must be either "confirmed" or "declined".');
    error.status = 400;
    throw error;
  }

  const confRef = vaultsCollection.doc(vaultId).collection('confirmations').doc(confirmationId);
  const confDoc = await confRef.get();

  if (!confDoc.exists) {
    const error = new Error('Confirmation request not found.');
    error.status = 404;
    throw error;
  }

  const conf = confDoc.data();
  await verifyTrustedPersonMatch(uid, vaultId, conf.trustedPersonId);

  if (conf.status !== 'pending') {
    const error = new Error(`Request has already been ${conf.status}.`);
    error.status = 400;
    throw error;
  }

  const expiresAt = conf.expiresAt.toDate ? conf.expiresAt.toDate() : new Date(conf.expiresAt);
  if (expiresAt < new Date()) {
    await confRef.update({ status: 'expired', updatedAt: FieldValue.serverTimestamp() });
    const error = new Error('This request has expired.');
    error.status = 400;
    throw error;
  }

  // Update response status
  await confRef.update({
    status: responseStatus,
    respondedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const action = responseStatus === 'confirmed' ? 'confirmation_confirmed' : 'confirmation_declined';
  await logAuditEvent(vaultId, conf.ownerId, uid, action, 'confirmation', confirmationId);

  // Trigger immediate Rule evaluation or Emergency Request Verification loop
  if (conf.emergencyRequestId) {
    if (responseStatus === 'confirmed') {
      const verDocs = [];
      const vaultsSnapshot = await vaultsCollection.get();
      for (const vaultDoc of vaultsSnapshot.docs) {
        const snap = await vaultDoc.ref.collection('verifications').where('emergencyRequestId', '==', conf.emergencyRequestId).limit(1).get();
        snap.forEach(d => verDocs.push(d));
      }

      if (verDocs.length > 0) {
        const verDoc = verDocs[0];
        const verData = verDoc.data();
        const updatedSteps = { ...verData.steps };
        
        if (updatedSteps.trusted_person_confirmation) {
          updatedSteps.trusted_person_confirmation.status = 'completed';
        }

        const pendingRequired = Object.keys(updatedSteps).filter(key => updatedSteps[key].required && updatedSteps[key].status !== 'completed');
        
        const updates = {
          steps: updatedSteps,
          updatedAt: FieldValue.serverTimestamp()
        };

        if (pendingRequired.length === 0) {
          updates.status = 'completed';
          updates.completedAt = FieldValue.serverTimestamp();
        }

        await verDoc.ref.update(updates);

        if (pendingRequired.length === 0) {
          const { triggerReleaseFromRequest } = await import('./controlledReleaseService.js');
          await triggerReleaseFromRequest(conf.vaultId, conf.emergencyRequestId);
        }
      }
    } else {
      // If a trusted person declined the confirmation request, fail the verification!
      const verDocs = [];
      const vaultsSnapshot = await vaultsCollection.get();
      for (const vaultDoc of vaultsSnapshot.docs) {
        const snap = await vaultDoc.ref.collection('verifications').where('emergencyRequestId', '==', conf.emergencyRequestId).limit(1).get();
        snap.forEach(d => verDocs.push(d));
      }

      if (verDocs.length > 0) {
        const verDoc = verDocs[0];
        await verDoc.ref.update({
          status: 'failed',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }
  } else if (conf.ruleId) {
    await evaluateRule(vaultId, conf.ruleId);
  }

  const updatedDoc = await confRef.get();
  return updatedDoc.data();
}
