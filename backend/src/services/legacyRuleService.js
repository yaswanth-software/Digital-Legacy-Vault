import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getOrCreatePrimaryVault } from './vaultService.js';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

// Validation presets
const TRIGGER_TYPES = ['missed_check_in', 'manual_release', 'future_verification'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Fetch all rules for the user's primary vault.
 */
export async function getRules(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const snapshot = await vaultsCollection.doc(vault.id).collection('legacyRules').get();
  return snapshot.docs.map(doc => doc.data());
}

/**
 * Fetch a single rule, verifying ownership.
 */
export async function getRuleById(uid, ruleId) {
  const vault = await getOrCreatePrimaryVault(uid);
  const ruleRef = vaultsCollection.doc(vault.id).collection('legacyRules').doc(ruleId);
  const doc = await ruleRef.get();

  if (!doc.exists) {
    const error = new Error('Legacy rule not found.');
    error.status = 404;
    throw error;
  }

  const rule = doc.data();
  if (rule.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this legacy rule.');
    error.status = 403;
    throw error;
  }

  return rule;
}

/**
 * Create a new legacy rule (initially as a draft).
 */
export async function createRule(uid, data) {
  const vault = await getOrCreatePrimaryVault(uid);

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    const error = new Error('Rule Name is required and must be at least 2 characters.');
    error.status = 400;
    throw error;
  }

  const triggerType = data.triggerType || 'missed_check_in';
  if (!TRIGGER_TYPES.includes(triggerType)) {
    const error = new Error(`Trigger type must be one of: ${TRIGGER_TYPES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const priority = data.priority || 'medium';
  if (!PRIORITIES.includes(priority)) {
    const error = new Error(`Priority must be one of: ${PRIORITIES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const ruleRef = vaultsCollection.doc(vault.id).collection('legacyRules').doc();
  const ruleId = ruleRef.id;

  const newRule = {
    id: ruleId,
    ownerId: uid,
    vaultId: vault.id,
    name: data.name.trim(),
    description: (data.description || '').trim(),
    triggerType,
    assetIds: Array.isArray(data.assetIds) ? data.assetIds : [],
    trustedPersonIds: Array.isArray(data.trustedPersonIds) ? data.trustedPersonIds : [],
    conditions: {
      checkInMissed: true,
      gracePeriodCompleted: true,
      trustedConfirmationRequired: data.conditions?.trustedConfirmationRequired !== false,
      additionalVerificationRequired: !!data.conditions?.additionalVerificationRequired
    },
    status: 'draft', // draft, active, paused, triggered, verification_pending, eligible, cancelled
    priority,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ruleRef.set(newRule);
  await logAuditEvent(vault.id, uid, uid, 'rule_created', 'legacy_rule', ruleId);

  return newRule;
}

/**
 * Update an existing legacy rule.
 */
export async function updateRule(uid, ruleId, updateData) {
  const rule = await getRuleById(uid, ruleId);

  if (['triggered', 'verification_pending', 'eligible', 'released'].includes(rule.status)) {
    const error = new Error('Cannot modify a rule that is active or triggered in the evaluation chain.');
    error.status = 400;
    throw error;
  }

  const allowedUpdates = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updateData.name !== undefined) {
    if (updateData.name.trim().length < 2) {
      const error = new Error('Rule Name must be at least 2 characters.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.name = updateData.name.trim();
  }

  if (updateData.description !== undefined) {
    allowedUpdates.description = (updateData.description || '').trim();
  }

  if (updateData.triggerType !== undefined) {
    if (!TRIGGER_TYPES.includes(updateData.triggerType)) {
      const error = new Error('Invalid trigger type.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.triggerType = updateData.triggerType;
  }

  if (updateData.priority !== undefined) {
    if (!PRIORITIES.includes(updateData.priority)) {
      const error = new Error('Invalid priority level.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.priority = updateData.priority;
  }

  if (updateData.assetIds !== undefined) {
    allowedUpdates.assetIds = Array.isArray(updateData.assetIds) ? updateData.assetIds : [];
  }

  if (updateData.trustedPersonIds !== undefined) {
    allowedUpdates.trustedPersonIds = Array.isArray(updateData.trustedPersonIds) ? updateData.trustedPersonIds : [];
  }

  if (updateData.conditions !== undefined) {
    allowedUpdates.conditions = {
      checkInMissed: true,
      gracePeriodCompleted: true,
      trustedConfirmationRequired: updateData.conditions?.trustedConfirmationRequired !== false,
      additionalVerificationRequired: !!updateData.conditions?.additionalVerificationRequired
    };
  }

  // Force back to draft if modifying key selectors
  if (rule.status === 'active') {
    allowedUpdates.status = 'draft';
  }

  const ruleRef = vaultsCollection.doc(rule.vaultId).collection('legacyRules').doc(ruleId);
  await ruleRef.update(allowedUpdates);

  const updatedDoc = await ruleRef.get();
  return updatedDoc.data();
}

/**
 * Delete a legacy rule.
 */
export async function deleteRule(uid, ruleId) {
  const rule = await getRuleById(uid, ruleId);

  const ruleRef = vaultsCollection.doc(rule.vaultId).collection('legacyRules').doc(ruleId);
  await ruleRef.delete();

  await logAuditEvent(rule.vaultId, uid, uid, 'rule_cancelled', 'legacy_rule', ruleId);
  return { id: ruleId, deleted: true };
}

/**
 * Validate and Activate a legacy rule.
 */
export async function activateRule(uid, ruleId) {
  const rule = await getRuleById(uid, ruleId);

  // Validation Check 1: Check-in settings exist
  const settingsDoc = await vaultsCollection
    .doc(rule.vaultId)
    .collection('continuitySettings')
    .doc('default')
    .get();

  if (!settingsDoc.exists) {
    const error = new Error('Before activating this rule, please configure your Legacy Continuity check-in settings.');
    error.status = 400;
    throw error;
  }

  // Validation Check 2: At least one asset and one trusted person selected
  if (rule.assetIds.length === 0) {
    const error = new Error('Activation failed. Please select at least one asset.');
    error.status = 400;
    throw error;
  }

  if (rule.trustedPersonIds.length === 0) {
    const error = new Error('Activation failed. Please select at least one trusted person.');
    error.status = 400;
    throw error;
  }

  // Validation Check 3: Selected assets must exist, be active, and belong to the owner
  const assetsRef = vaultsCollection.doc(rule.vaultId).collection('assets');
  for (const assetId of rule.assetIds) {
    const aDoc = await assetsRef.doc(assetId).get();
    if (!aDoc.exists) {
      const error = new Error(`Activation failed. Asset with ID ${assetId} not found.`);
      error.status = 400;
      throw error;
    }
    const asset = aDoc.data();
    if (asset.ownerId !== uid) {
      const error = new Error('Security Error. You do not own the selected asset.');
      error.status = 403;
      throw error;
    }
    if (asset.status === 'archived') {
      const error = new Error(`Activation failed. Asset "${asset.name}" is archived. Reactivate or remove it.`);
      error.status = 400;
      throw error;
    }
  }

  // Validation Check 4: Trusted people must exist, be active, and have accepted invitations
  const tpRef = vaultsCollection.doc(rule.vaultId).collection('trustedPeople');
  for (const tpId of rule.trustedPersonIds) {
    const tpDoc = await tpRef.doc(tpId).get();
    if (!tpDoc.exists) {
      const error = new Error(`Activation failed. Trusted Person with ID ${tpId} not found.`);
      error.status = 400;
      throw error;
    }
    const tp = tpDoc.data();
    if (tp.removedAt || tp.status === 'revoked') {
      const error = new Error(`Activation failed. "${tp.fullName}" has been revoked or removed.`);
      error.status = 400;
      throw error;
    }
    if (tp.invitationStatus !== 'accepted') {
      const error = new Error(`Activation failed. "${tp.fullName}" has not accepted your invitation yet.`);
      error.status = 400;
      throw error;
    }
  }

  // Validation Check 5: Access permissions must be configured for each selected trusted person and asset
  const permissionsRef = vaultsCollection.doc(rule.vaultId).collection('accessPermissions');
  for (const tpId of rule.trustedPersonIds) {
    for (const assetId of rule.assetIds) {
      const pSnapshot = await permissionsRef
        .where('trustedPersonId', '==', tpId)
        .where('assetId', '==', assetId)
        .get();

      if (pSnapshot.empty) {
        const error = new Error(`Activation failed. Please configure access levels and permissions for your selected asset-person combinations.`);
        error.status = 400;
        throw error;
      }
      
      const perm = pSnapshot.docs[0].data();
      if (perm.accessLevel === 'no_access') {
        const error = new Error(`Activation failed. Access level is set to "No Access" for one of your combinations.`);
        error.status = 400;
        throw error;
      }
    }
  }

  // Save activation
  const ruleRef = vaultsCollection.doc(rule.vaultId).collection('legacyRules').doc(ruleId);
  await ruleRef.update({
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(rule.vaultId, uid, uid, 'rule_activated', 'legacy_rule', ruleId);

  const updatedDoc = await ruleRef.get();
  return updatedDoc.data();
}

/**
 * Pause an active legacy rule.
 */
export async function pauseRule(uid, ruleId) {
  const rule = await getRuleById(uid, ruleId);

  if (rule.status !== 'active') {
    const error = new Error('Only active legacy rules can be paused.');
    error.status = 400;
    throw error;
  }

  const ruleRef = vaultsCollection.doc(rule.vaultId).collection('legacyRules').doc(ruleId);
  await ruleRef.update({
    status: 'paused',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(rule.vaultId, uid, uid, 'rule_paused', 'legacy_rule', ruleId);

  const updatedDoc = await ruleRef.get();
  return updatedDoc.data();
}

/**
 * Execute Controlled Release for an eligible or triggered Legacy Rule.
 * Generates release tokens and limited-time access for designated recipients.
 */
export async function executeRuleRelease(uid, ruleId) {
  const rule = await getRuleById(uid, ruleId);

  if (!['eligible', 'active', 'triggered', 'verification_pending'].includes(rule.status)) {
    const error = new Error(`Cannot execute release for a rule with status "${rule.status}". Rule must be eligible or active.`);
    error.status = 400;
    throw error;
  }

  const { createRelease } = await import('./controlledReleaseService.js');
  const createdReleases = [];

  const tpCollectionRef = vaultsCollection.doc(rule.vaultId).collection('trustedPeople');
  const permCollectionRef = vaultsCollection.doc(rule.vaultId).collection('accessPermissions');

  for (const tpId of rule.trustedPersonIds) {
    const tpDoc = await tpCollectionRef.doc(tpId).get();
    if (tpDoc.exists) {
      const tp = tpDoc.data();
      const recipientId = tp.acceptedUserId || tp.email;

      // Determine access level from permission config or role default
      let accessLevel = tp.role === 'legacy_executor' ? 'download' : 'view';
      const permSnap = await permCollectionRef.where('trustedPersonId', '==', tpId).get();
      if (!permSnap.empty) {
        const pData = permSnap.docs[0].data();
        if (pData.accessLevel) accessLevel = pData.accessLevel;
      }

      const release = await createRelease(rule.vaultId, {
        recipientId,
        trustedPersonId: tpId,
        ruleId,
        emergencyRequestId: null,
        assetIds: rule.assetIds,
        accessLevel
      });

      createdReleases.push(release);
    }
  }

  // Update rule status to 'released'
  const ruleRef = vaultsCollection.doc(rule.vaultId).collection('legacyRules').doc(ruleId);
  await ruleRef.update({
    status: 'released',
    releasedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await logAuditEvent(rule.vaultId, uid, uid, 'rule_released', 'legacy_rule', ruleId);

  return {
    ruleId,
    status: 'released',
    releasesCount: createdReleases.length,
    releases: createdReleases
  };
}

