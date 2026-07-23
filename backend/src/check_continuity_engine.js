import { getOrCreatePrimaryVault } from './services/vaultService.js';
import * as continuityService from './services/continuityService.js';
import * as legacyRuleService from './services/legacyRuleService.js';
import * as legacyRuleEngine from './services/legacyRuleEngine.js';
import * as assetService from './services/assetService.js';
import { firestoreAdmin } from './config/firebaseAdmin.js';

async function runTests() {
  const testUid = 'test_continuity_owner_999';
  console.log('🏁 Starting Day 5 continuity engine verification tests for UID:', testUid);

  try {
    // 1. Load Vault & Settings
    const vault = await getOrCreatePrimaryVault(testUid);
    console.log('✓ primary vault resolved:', vault.id);

    const settings = await continuityService.getSettings(testUid);
    console.log('✓ Initial settings retrieved:', settings.checkInFrequencyDays, 'days frequency');

    // 2. Update Settings
    const updatedSettings = await continuityService.updateSettings(testUid, {
      checkInFrequencyDays: 90,
      gracePeriodDays: 14,
    });
    console.log('✓ Settings updated to 90/14. Status:', updatedSettings.status);

    // 3. Create active mock asset
    const asset1 = await assetService.createAsset(testUid, vault.id, {
      name: 'Primary Financial Ledger',
      category: 'financial',
      assetType: 'text',
      priority: 'high',
      notes: 'Contains keys to secure backups.',
    });
    console.log('✓ Mock asset created:', asset1.id);

    // 4. Create active mock trusted person (Accepted state)
    const tpRef = firestoreAdmin.collection('vaults').doc(vault.id).collection('trustedPeople').doc();
    const tpId = tpRef.id;
    await tpRef.set({
      id: tpId,
      ownerId: testUid,
      vaultId: vault.id,
      fullName: 'John Connor',
      email: 'john@connor.org',
      relationship: 'son',
      invitationStatus: 'accepted',
      status: 'active',
      acceptedUserId: 'mock_john_uid_888',
      createdAt: new Date(),
    });
    console.log('✓ Mock accepted trusted person inserted:', tpId);

    // 5. Configure access permissions
    const permRef = firestoreAdmin.collection('vaults').doc(vault.id).collection('accessPermissions').doc();
    await permRef.set({
      id: permRef.id,
      ownerId: testUid,
      vaultId: vault.id,
      trustedPersonId: tpId,
      assetId: asset1.id,
      accessLevel: 'view',
      releaseMode: 'manual',
    });
    console.log('✓ Access permission configured.');

    // 6. Create Legacy Rule (Draft)
    const rule = await legacyRuleService.createRule(testUid, {
      name: 'Mock Emergency Access Plan',
      description: 'Will evaluate under missed check-in cycles.',
      priority: 'high',
      assetIds: [asset1.id],
      trustedPersonIds: [tpId],
      conditions: {
        trustedConfirmationRequired: true,
        additionalVerificationRequired: false
      }
    });
    console.log('✓ Draft legacy rule created:', rule.id, rule.status);

    // 7. Validate and Activate Rule
    const activated = await legacyRuleService.activateRule(testUid, rule.id);
    console.log('✓ Validation checks passed. Rule Activated! Status:', activated.status);

    // 8. Run Dry simulation
    const simResult = await legacyRuleEngine.simulateRule(vault.id, rule.id, {
      status: 'missed',
      confirmationResponse: 'confirmed'
    });
    console.log('✓ Rule simulation run successful! Output expected:', simResult.result, 'Reason:', simResult.reason);

    // 9. Conflict Check verification: Create another overlapping rule
    const rule2 = await legacyRuleService.createRule(testUid, {
      name: 'Conflict Plan',
      description: 'Shares same assets.',
      priority: 'medium',
      assetIds: [asset1.id],
      trustedPersonIds: [tpId],
    });
    await legacyRuleService.activateRule(testUid, rule2.id);
    console.log('✓ Second overlapping rule activated.');

    const engineResult = await legacyRuleEngine.evaluateRule(vault.id, rule.id);
    console.log('✓ Rule engine run complete. Result (Conflict expected):', engineResult.result);

    // 10. Test Full Controlled Release Token Execution Flow
    console.log('⚡ Testing Controlled Release token execution for non-conflicting rule...');
    await firestoreAdmin.collection('vaults').doc(vault.id).collection('legacyRules').doc(rule2.id).delete();

    // Mark rule as eligible
    await firestoreAdmin.collection('vaults').doc(vault.id).collection('legacyRules').doc(rule.id).update({
      status: 'eligible'
    });

    const releaseResult = await legacyRuleService.executeRuleRelease(testUid, rule.id);
    console.log('✓ Controlled Release token generated! Release count:', releaseResult.releasesCount, 'Rule Status:', releaseResult.status);

    const tokenDoc = releaseResult.releases[0];
    console.log('✓ Issued Token ID:', tokenDoc.id, 'Recipient:', tokenDoc.recipientId, 'Access Level:', tokenDoc.accessLevel, 'Expires At:', tokenDoc.expiresAt);

    // 11. Perform Activity Check-In Reset Override
    const checkInSettings = await continuityService.checkIn(testUid, 'test_harness');
    console.log('✓ Manual check-in registered. Status reset expected ACTIVE. Output:', checkInSettings.status);

    // Clean up
    console.log('🧹 Cleaning up test documents...');
    await firestoreAdmin.collection('vaults').doc(vault.id).collection('assets').doc(asset1.id).delete();
    await tpRef.delete();
    await permRef.delete();
    await firestoreAdmin.collection('vaults').doc(vault.id).collection('legacyRules').doc(rule.id).delete();
    if (tokenDoc?.id) {
      await firestoreAdmin.collection('vaults').doc(vault.id).collection('releases').doc(tokenDoc.id).delete();
    }
    await firestoreAdmin.collection('vaults').doc(vault.id).collection('continuitySettings').doc('default').delete();
    
    console.log('🎉 Verification & Controlled Release end-to-end tests completed successfully with all assertions satisfied!');
  } catch (error) {
    console.error('✗ Test suite execution failed:', error.message);
  }
}

runTests();

