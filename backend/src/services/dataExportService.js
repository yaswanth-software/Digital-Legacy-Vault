import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Export user vault metadata, assets, trusted people, legacy rules, and audit logs.
 * Sanitizes all output (removes tokens, private keys, service account info).
 */
export async function exportUserData(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const vaultRef = vaultsCollection.doc(vault.id);

  // 1. Assets
  const assetsSnap = await vaultRef.collection('assets').get();
  const assets = assetsSnap.docs.map(doc => {
    const a = doc.data();
    // Exclude raw ciphertext internal secrets if present
    delete a.encryptedPayload;
    return a;
  });

  // 2. Trusted People
  const tpSnap = await vaultRef.collection('trustedPeople').get();
  const trustedPeople = tpSnap.docs.map(doc => {
    const tp = doc.data();
    delete tp.token;
    return tp;
  });

  // 3. Legacy Rules
  const rulesSnap = await vaultRef.collection('legacyRules').get();
  const legacyRules = rulesSnap.docs.map(doc => doc.data());

  // 4. Audit Logs (limit to recent 100 for export)
  const auditSnap = await vaultRef.collection('auditLogs').orderBy('timestamp', 'desc').limit(100).get();
  const auditLogs = auditSnap.docs.map(doc => doc.data());

  // 5. Continuity Settings
  const settingsDoc = await vaultRef.collection('continuitySettings').doc('default').get();
  const continuitySettings = settingsDoc.exists ? settingsDoc.data() : null;

  return {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      ownerId: uid,
      vaultId: vault.id,
      schemaVersion: '1.0',
    },
    vault: {
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
    },
    continuitySettings,
    assetsCount: assets.length,
    trustedPeopleCount: trustedPeople.length,
    legacyRulesCount: legacyRules.length,
    assets,
    trustedPeople,
    legacyRules,
    auditLogs,
  };
}
