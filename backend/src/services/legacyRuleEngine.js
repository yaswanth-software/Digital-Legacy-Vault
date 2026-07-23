import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getRuleById } from './legacyRuleService.js';
import { createNotification } from './notificationService.js';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Perform conflict detection for active rules targeting the same assets.
 */
async function checkConflicts(vaultId, rule) {
  const rulesSnapshot = await vaultsCollection.doc(vaultId).collection('legacyRules').get();
  const rules = rulesSnapshot.docs.map(doc => doc.data());

  for (const otherRule of rules) {
    if (otherRule.id === rule.id || otherRule.status === 'draft' || otherRule.status === 'paused' || otherRule.status === 'cancelled') {
      continue;
    }
    // Check asset intersection
    const intersection = rule.assetIds.filter(id => otherRule.assetIds.includes(id));
    if (intersection.length > 0) {
      return true; // Overlap detected
    }
  }
  return false;
}

/**
 * Helper to record evaluation details.
 */
async function logRuleEvaluation(vaultId, ownerId, ruleId, result, reason, conditions = {}) {
  try {
    const evalRef = vaultsCollection.doc(vaultId).collection('ruleEvaluations').doc();
    await evalRef.set({
      id: evalRef.id,
      ownerId,
      vaultId,
      ruleId,
      result,
      reason,
      conditions,
      evaluatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log rule evaluation:', error.message);
  }
}

/**
 * Evaluate a single legacy rule. Updates rule status and logs history.
 */
export async function evaluateRule(vaultId, ruleId) {
  const ruleRef = vaultsCollection.doc(vaultId).collection('legacyRules').doc(ruleId);
  const ruleDoc = await ruleRef.get();

  if (!ruleDoc.exists) {
    throw new Error('Rule not found.');
  }

  const rule = ruleDoc.data();

  // If rule is in a final or paused state, skip evaluation
  if (['draft', 'paused', 'cancelled', 'released'].includes(rule.status)) {
    return { ruleId, result: 'NOT_EVALUATED', status: rule.status };
  }

  // Conflict Check (Safety-First)
  const isConflict = await checkConflicts(vaultId, rule);
  if (isConflict) {
    await ruleRef.update({ status: 'conflict', updatedAt: FieldValue.serverTimestamp() });
    await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'CONFLICT', 'Multiple active legacy rules target overlapping assets. Release blocked.');
    return { ruleId, result: 'CONFLICT', status: 'conflict' };
  }

  // Load Continuity Settings
  const settingsDoc = await vaultsCollection.doc(vaultId).collection('continuitySettings').doc('default').get();
  if (!settingsDoc.exists) {
    return { ruleId, result: 'BLOCKED', status: rule.status, reason: 'Continuity settings missing.' };
  }

  const settings = settingsDoc.data();

  // 1. If paused, rule is inactive
  if (settings.status === 'paused') {
    if (rule.status !== 'active') {
      await ruleRef.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
    }
    return { ruleId, result: 'NOT_TRIGGERED', status: 'active' };
  }

  // 2. If check-in is ACTIVE or DUE, rule remains safely NOT_TRIGGERED
  if (settings.status === 'active' || settings.status === 'due') {
    if (rule.status !== 'active') {
      await ruleRef.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
      await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'NOT_TRIGGERED', 'Owner check-in status is active.');
    }
    return { ruleId, result: 'NOT_TRIGGERED', status: 'active' };
  }

  // 3. If REMINDER_SENT or GRACE_PERIOD, rule is TRIGGERED
  if (settings.status === 'reminder_sent' || settings.status === 'grace_period') {
    await ruleRef.update({ status: 'triggered', updatedAt: FieldValue.serverTimestamp() });
    await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'TRIGGERED', 'Owner check-in is overdue and grace period is active.');
    await createNotification(rule.ownerId, {
      type: 'owner_final_warning',
      title: 'Action Required: Legacy Rule Triggered',
      message: `Your rule "${rule.name}" has been triggered. Confirm you're active to cancel.`,
      relatedRuleId: ruleId,
      relatedVaultId: vaultId,
    });
    return { ruleId, result: 'TRIGGERED', status: 'triggered' };
  }

  // 4. If MISSED, check verification conditions
  if (settings.status === 'missed') {
    const cond = rule.conditions;

    if (cond.trustedConfirmationRequired) {
      const confirmationsRef = vaultsCollection.doc(vaultId).collection('confirmations');
      const snapshot = await confirmationsRef.where('ruleId', '==', ruleId).get();
      const confirmations = snapshot.docs.map(doc => doc.data());

      // If no confirmation requests exist, generate them
      if (confirmations.length === 0) {
        const batch = firestoreAdmin.batch();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // Expires in 14 days

        const tpCollectionRef = vaultsCollection.doc(vaultId).collection('trustedPeople');

        for (const tpId of rule.trustedPersonIds) {
          const tpDoc = await tpCollectionRef.doc(tpId).get();
          if (tpDoc.exists) {
            const tp = tpDoc.data();
            const confRef = confirmationsRef.doc();
            const confId = confRef.id;

            batch.set(confRef, {
              id: confId,
              ownerId: rule.ownerId,
              vaultId,
              trustedPersonId: tpId,
              ruleId,
              status: 'pending',
              requestedAt: FieldValue.serverTimestamp(),
              respondedAt: null,
              expiresAt,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            // Notify Trusted Person (if accepted and Firebase UID linked)
            if (tp.acceptedUserId) {
              await createNotification(tp.acceptedUserId, {
                type: 'trusted_person_confirmation_requested',
                title: 'Action Required: Confirmation Request',
                message: `You've been requested to confirm the unavailability of legacy owner.`,
                relatedRuleId: ruleId,
                relatedVaultId: vaultId,
                confirmationId: confId,
              });
            }
          }
        }
        await batch.commit();
        await ruleRef.update({ status: 'verification_pending', updatedAt: FieldValue.serverTimestamp() });
        await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'VERIFICATION_PENDING', 'Check-in missed. Confirmation requests dispatched to trusted people.');
        await logAuditEvent(vaultId, rule.ownerId, rule.ownerId, 'confirmation_requested', 'legacy_rule', ruleId);
        return { ruleId, result: 'VERIFICATION_PENDING', status: 'verification_pending' };
      }

      // Check if all requests have been confirmed
      const pendingCount = confirmations.filter(c => c.status === 'pending').length;
      const declinedCount = confirmations.filter(c => c.status === 'declined').length;
      const confirmedCount = confirmations.filter(c => c.status === 'confirmed').length;

      if (declinedCount > 0) {
        // If a trusted person explicitly declined, block release for safety
        await ruleRef.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
        await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'BLOCKED', 'A trusted person declined confirmation. Rule reset to active.');
        return { ruleId, result: 'BLOCKED', status: 'active', reason: 'Declined by trusted person.' };
      }

      if (pendingCount > 0) {
        await ruleRef.update({ status: 'verification_pending', updatedAt: FieldValue.serverTimestamp() });
        await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'VERIFICATION_PENDING', 'Awaiting trusted person confirmation responses.');
        return { ruleId, result: 'VERIFICATION_PENDING', status: 'verification_pending' };
      }

      // All confirmed!
      if (confirmedCount === confirmations.length) {
        await ruleRef.update({ status: 'eligible', updatedAt: FieldValue.serverTimestamp() });
        await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'ELIGIBLE', 'All verification checks passed. Rule marked as eligible.');
        await createNotification(rule.ownerId, {
          type: 'rule_eligible',
          title: 'Legacy Rule Eligible',
          message: `Your legacy rule "${rule.name}" is now ready for review.`,
          relatedRuleId: ruleId,
          relatedVaultId: vaultId,
        });
        await logAuditEvent(vaultId, rule.ownerId, rule.ownerId, 'rule_eligible', 'legacy_rule', ruleId);
        return { ruleId, result: 'ELIGIBLE', status: 'eligible' };
      }
    } else {
      // No confirmation required, direct transition to eligible
      await ruleRef.update({ status: 'eligible', updatedAt: FieldValue.serverTimestamp() });
      await logRuleEvaluation(vaultId, rule.ownerId, ruleId, 'ELIGIBLE', 'Check-in missed. No confirmation requirements configured.');
      await logAuditEvent(vaultId, rule.ownerId, rule.ownerId, 'rule_eligible', 'legacy_rule', ruleId);
      return { ruleId, result: 'ELIGIBLE', status: 'eligible' };
    }
  }

  return { ruleId, result: 'NOT_TRIGGERED', status: rule.status };
}

/**
 * Dry-run simulation mode (does NOT change real data or send notifications).
 */
export async function simulateRule(vaultId, ruleId, assumedCheckInState) {
  const ruleRef = vaultsCollection.doc(vaultId).collection('legacyRules').doc(ruleId);
  const ruleDoc = await ruleRef.get();

  if (!ruleDoc.exists) {
    throw new Error('Rule not found.');
  }

  const rule = ruleDoc.data();
  const cond = rule.conditions;

  const status = assumedCheckInState.status || 'active';
  const confirmationResponse = assumedCheckInState.confirmationResponse || 'pending'; // pending, confirmed, declined

  if (['draft', 'paused', 'cancelled', 'released'].includes(rule.status)) {
    return { result: 'NOT_EVALUATED', status: rule.status, reason: 'Rule is not in active state.' };
  }

  // Conflict Mock Check
  const isConflict = await checkConflicts(vaultId, rule);
  if (isConflict) {
    return { result: 'CONFLICT', status: 'conflict', reason: 'Conflict detected with overlapping active asset rules.' };
  }

  if (status === 'active' || status === 'due') {
    return { result: 'NOT_TRIGGERED', status: 'active', reason: 'User check-in is active.' };
  }

  if (status === 'reminder_sent' || status === 'grace_period') {
    return { result: 'TRIGGERED', status: 'triggered', reason: 'User checks are overdue, grace period running.' };
  }

  if (status === 'missed') {
    if (cond.trustedConfirmationRequired) {
      if (confirmationResponse === 'pending') {
        return { result: 'VERIFICATION_PENDING', status: 'verification_pending', reason: 'Awaiting trusted person unavailability confirmations.' };
      }
      if (confirmationResponse === 'declined') {
        return { result: 'BLOCKED', status: 'active', reason: 'Safety Blocked. A trusted person declined the confirmation request.' };
      }
      if (confirmationResponse === 'confirmed') {
        return { result: 'ELIGIBLE', status: 'eligible', reason: 'Verification checks satisfied. Ready for review.' };
      }
    } else {
      return { result: 'ELIGIBLE', status: 'eligible', reason: 'Verification satisfied (no confirmation requested).' };
    }
  }

  return { result: 'NOT_TRIGGERED', status: rule.status };
}
