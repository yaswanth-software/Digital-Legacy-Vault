import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Get or create the authenticated user's primary legacy vault.
 * Each user has one primary vault for the MVP.
 * 
 * @param {string} uid - Firebase Auth User UID
 * @returns {Promise<object>} Vault data
 */
export async function getOrCreatePrimaryVault(uid) {
  const querySnapshot = await vaultsCollection.where('ownerId', '==', uid).limit(1).get();

  if (!querySnapshot.empty) {
    const vaultDoc = querySnapshot.docs[0];
    return vaultDoc.data();
  }

  // Vault does not exist, create it
  const vaultRef = vaultsCollection.doc();
  const vaultId = vaultRef.id;
  const newVault = {
    id: vaultId,
    ownerId: uid,
    name: 'My Legacy Vault',
    description: 'Your secure space for organizing your digital legacy.',
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await vaultRef.set(newVault);
  const createdDoc = await vaultRef.get();
  return createdDoc.data();
}

/**
 * Update the user's legacy vault metadata (name, description).
 * 
 * @param {string} uid - Firebase Auth User UID
 * @param {string} vaultId - Vault document ID
 * @param {object} updateData - Updated name and/or description
 * @returns {Promise<object>} Updated vault data
 */
export async function updateVault(uid, vaultId, updateData) {
  const vaultRef = vaultsCollection.doc(vaultId);
  const vaultDoc = await vaultRef.get();

  if (!vaultDoc.exists) {
    const error = new Error('Vault not found.');
    error.status = 404;
    throw error;
  }

  const vault = vaultDoc.data();

  // Security Check: Verify user owns this vault
  if (vault.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this vault.');
    error.status = 403;
    throw error;
  }

  const allowedUpdates = {};
  if (updateData.name !== undefined) allowedUpdates.name = updateData.name.trim();
  if (updateData.description !== undefined) allowedUpdates.description = updateData.description.trim();

  allowedUpdates.updatedAt = FieldValue.serverTimestamp();

  await vaultRef.update(allowedUpdates);

  const updatedDoc = await vaultRef.get();
  return updatedDoc.data();
}
