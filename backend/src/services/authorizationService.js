import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Helper to find a specific subdocument snapshot by ID across all vaults.
 */
async function findSubdocumentById(subcollectionName, docId) {
  if (!vaultsCollection) return null;
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
 * Check if requesting UID is the Vault Owner.
 */
export async function isVaultOwner(uid, vaultId) {
  if (!uid || !vaultId) return false;
  const vaultDoc = await vaultsCollection.doc(vaultId).get();
  if (!vaultDoc.exists) return false;
  return vaultDoc.data().ownerId === uid;
}

/**
 * Check if requesting UID is a recognized active Trusted Person in a vault.
 */
export async function isTrustedPerson(uid, vaultId, trustedPersonId) {
  if (!uid || !vaultId) return false;
  const tpRef = vaultsCollection.doc(vaultId).collection('trustedPeople');

  if (trustedPersonId) {
    const tpDoc = await tpRef.doc(trustedPersonId).get();
    if (!tpDoc.exists) return false;
    const tp = tpDoc.data();
    return (tp.acceptedUserId === uid || tp.email === uid) && tp.status === 'active' && !tp.removedAt;
  }

  // If no trustedPersonId specified, check if user is any trusted person in vault
  const snap = await tpRef.where('acceptedUserId', '==', uid).get();
  if (snap.empty) return false;
  const activeDoc = snap.docs.find(d => d.data().status === 'active' && !d.data().removedAt);
  return !!activeDoc;
}

/**
 * Check general access to vault (Owner or Active Trusted Person with permissions).
 */
export async function canAccessVault(uid, vaultId) {
  const isOwner = await isVaultOwner(uid, vaultId);
  if (isOwner) return true;
  return isTrustedPerson(uid, vaultId);
}

/**
 * Check asset access for owner or active release token recipient.
 */
export async function canAccessAsset(uid, vaultId, assetId) {
  // 1. Owner check
  const isOwner = await isVaultOwner(uid, vaultId);
  if (isOwner) return true;

  // 2. Active Release Token Check
  const releasesSnap = await vaultsCollection.doc(vaultId).collection('releases')
    .where('recipientId', '==', uid)
    .where('status', '==', 'active')
    .get();

  if (releasesSnap.empty) return false;

  const now = new Date();
  for (const doc of releasesSnap.docs) {
    const rel = doc.data();
    const expiresAt = rel.expiresAt.toDate ? rel.expiresAt.toDate() : new Date(rel.expiresAt);
    if (expiresAt > now && rel.assetIds.includes(assetId)) {
      return true;
    }
  }

  return false;
}

/**
 * Check view access level for an asset.
 */
export async function canViewAsset(uid, vaultId, assetId, releaseId) {
  const isOwner = await isVaultOwner(uid, vaultId);
  if (isOwner) return true;

  if (releaseId) {
    const relDoc = await vaultsCollection.doc(vaultId).collection('releases').doc(releaseId).get();
    if (!relDoc.exists) return false;
    const rel = relDoc.data();
    const expiresAt = rel.expiresAt.toDate ? rel.expiresAt.toDate() : new Date(rel.expiresAt);
    return rel.recipientId === uid && rel.status === 'active' && expiresAt > new Date() && rel.assetIds.includes(assetId);
  }

  return canAccessAsset(uid, vaultId, assetId);
}

/**
 * Check download permission for asset files (requires 'download' accessLevel).
 */
export async function canDownloadAsset(uid, vaultId, assetId, releaseId) {
  const isOwner = await isVaultOwner(uid, vaultId);
  if (isOwner) return true;

  if (releaseId) {
    const relDoc = await vaultsCollection.doc(vaultId).collection('releases').doc(releaseId).get();
    if (!relDoc.exists) return false;
    const rel = relDoc.data();
    const expiresAt = rel.expiresAt.toDate ? rel.expiresAt.toDate() : new Date(rel.expiresAt);
    return (
      rel.recipientId === uid &&
      rel.status === 'active' &&
      expiresAt > new Date() &&
      rel.assetIds.includes(assetId) &&
      rel.accessLevel === 'download'
    );
  }

  return false;
}

/**
 * Check capability to manage trusted people (Owner only).
 */
export async function canManageTrustedPeople(uid, vaultId) {
  return isVaultOwner(uid, vaultId);
}

/**
 * Check capability to manage legacy rules (Owner only).
 */
export async function canManageLegacyRules(uid, vaultId) {
  return isVaultOwner(uid, vaultId);
}

/**
 * Check capability to request emergency access (Accepted active trusted person only).
 */
export async function canRequestEmergencyAccess(uid, vaultId) {
  return isTrustedPerson(uid, vaultId);
}

/**
 * Check authorization to view release details (Owner or Recipient).
 */
export async function canAccessRelease(uid, releaseId) {
  const relSnap = await findSubdocumentById('releases', releaseId);
  if (!relSnap) return false;
  const rel = relSnap.data();
  return rel.ownerId === uid || rel.recipientId === uid;
}

/**
 * Check authorization to revoke release (Owner only).
 */
export async function canRevokeRelease(uid, releaseId) {
  const relSnap = await findSubdocumentById('releases', releaseId);
  if (!relSnap) return false;
  return relSnap.data().ownerId === uid;
}
