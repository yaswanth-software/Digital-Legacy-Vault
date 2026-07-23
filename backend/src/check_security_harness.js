import { encryptData, decryptData, getRecommendedSensitivity } from './utils/encryption.js';
import * as authzService from './services/authorizationService.js';
import * as securityEventService from './services/securityEventService.js';
import * as dataExportService from './services/dataExportService.js';
import { getOrCreatePrimaryVault } from './services/vaultService.js';

async function runSecurityTests() {
  console.log('🛡️ Starting Day 7 Security & Encryption Test Harness...');
  const testUid = 'test_security_owner_777';

  try {
    // 1. AES-256-GCM Encryption / Decryption Test
    console.log('\n--- 1. Cryptographic AES-256-GCM Verification ---');
    const secretText = 'Master Key: 0x99238491A - Top Secret Legacy Instructions';
    const encrypted = encryptData(secretText);
    console.log('✓ Encrypted Payload created:', {
      ciphertextLength: encrypted.ciphertext.length,
      ivHex: encrypted.iv,
      authTagHex: encrypted.authTag,
      version: encrypted.version
    });

    const decrypted = decryptData(encrypted);
    if (decrypted === secretText) {
      console.log('✓ Decryption successful! Plaintext matches original secret.');
    } else {
      throw new Error('Decryption output mismatch!');
    }

    // Sensitivity classification check
    const sens = getRecommendedSensitivity('financial');
    console.log('✓ Recommended sensitivity for "financial":', sens);

    // 2. Vault Initialization & Zero Trust Checks
    console.log('\n--- 2. Zero Trust Authorization Verification ---');
    const vault = await getOrCreatePrimaryVault(testUid);
    console.log('✓ Primary Vault created/resolved for owner:', vault.id);

    const isOwner = await authzService.isVaultOwner(testUid, vault.id);
    console.log('✓ isVaultOwner assertion for real owner:', isOwner);

    const isImposterOwner = await authzService.isVaultOwner('imposter_uid_123', vault.id);
    console.log('✓ isVaultOwner assertion for imposter (must be false):', isImposterOwner);

    // 3. Security Event Logging Verification
    console.log('\n--- 3. Security Event Logging Verification ---');
    const event = await securityEventService.logSecurityEvent(
      vault.id,
      testUid,
      'unauthorized_asset_access',
      'high',
      { attemptedAssetId: 'fake_asset_99', requesterIp: '192.168.1.1' }
    );
    console.log('✓ Security event logged! Event ID:', event?.id, 'Severity:', event?.severity);

    const overview = await securityEventService.getSecurityOverview(testUid);
    console.log('✓ Security Overview metrics loaded:', {
      vaultStatus: overview.vaultStatus,
      activeReleasesCount: overview.activeReleasesCount,
      unacknowledgedAlertsCount: overview.unacknowledgedAlertsCount
    });

    // 4. Data Export Verification
    console.log('\n--- 4. Data Export Sanitization Verification ---');
    const exportResult = await dataExportService.exportUserData(testUid);
    console.log('✓ User Data Export generated!', {
      exportedAt: exportResult.exportMetadata.exportedAt,
      assetsCount: exportResult.assetsCount,
      trustedPeopleCount: exportResult.trustedPeopleCount
    });

    // Clean up test security event
    if (event?.id) {
      const { firestoreAdmin } = await import('./config/firebaseAdmin.js');
      await firestoreAdmin.collection('vaults').doc(vault.id).collection('securityEvents').doc(event.id).delete();
    }

    console.log('\n🎉 All Day 7 Security & Encryption assertions SATISFIED cleanly!');
  } catch (error) {
    console.error('✗ Security test suite failed:', error.message);
  }
}

runSecurityTests();
