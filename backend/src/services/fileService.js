import { firestoreAdmin, storageAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getAssetById } from './assetService.js';
import env from '../config/env.js';

// Helper to get Firebase Storage Bucket
function getBucket() {
  if (!storageAdmin) {
    throw new Error('Firebase Storage service is currently unavailable. Please check backend configuration.');
  }
  const bucketName = env.firebase.storageBucket;
  return bucketName ? storageAdmin.bucket(bucketName) : storageAdmin.bucket();
}

/**
 * Verify ownership chain: User -> Vault -> Asset
 */
export async function verifyAssetOwnership(uid, vaultId, assetId) {
  // getAssetById verifies:
  // 1. Vault belongs to the user
  // 2. Asset exists and belongs to the vault and user
  const asset = await getAssetById(uid, vaultId, assetId);
  return asset;
}

/**
 * Verify ownership chain: User -> Vault -> Asset -> File
 */
export async function verifyFileOwnership(uid, vaultId, assetId, fileId) {
  await verifyAssetOwnership(uid, vaultId, assetId);

  const fileDocRef = firestoreAdmin
    .collection('vaults')
    .doc(vaultId)
    .collection('assets')
    .doc(assetId)
    .collection('files')
    .doc(fileId);

  const fileDoc = await fileDocRef.get();
  if (!fileDoc.exists) {
    const error = new Error('File not found.');
    error.status = 404;
    throw error;
  }

  const fileData = fileDoc.data();
  if (fileData.ownerId !== uid || fileData.assetId !== assetId) {
    const error = new Error('Unauthorized. You do not have permission to access this file.');
    error.status = 403;
    throw error;
  }

  return { fileData, fileDocRef };
}

/**
 * Upload a single file buffer to Firebase Storage and create Firestore metadata.
 */
export async function uploadFile(uid, vaultId, assetId, file) {
  const asset = await verifyAssetOwnership(uid, vaultId, assetId);

  const bucket = getBucket();
  const fileId = firestoreAdmin.collection('vaults').doc().id; // generate unique fileId

  // Sanitize filename: remove special characters, replace spaces with underscores, preserve extension
  const parsedName = file.originalname.split('.');
  const extension = parsedName.length > 1 ? parsedName.pop().toLowerCase() : '';
  const sanitizedBase = parsedName.join('.')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 100);
  const sanitizedName = extension ? `${sanitizedBase}.${extension}` : sanitizedBase;

  // storage path: users/{uid}/vaults/{vaultId}/assets/{assetId}/files/{fileId}_{sanitizedName}
  const storagePath = `users/${uid}/vaults/${vaultId}/assets/${assetId}/files/${fileId}_${sanitizedName}`;

  try {
    // 1. Save to Storage
    const storageFileRef = bucket.file(storagePath);
    await storageFileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    // 2. Save metadata to Firestore and increment fileCount
    const fileDocRef = firestoreAdmin
      .collection('vaults')
      .doc(vaultId)
      .collection('assets')
      .doc(assetId)
      .collection('files')
      .doc(fileId);

    const metadata = {
      id: fileId,
      ownerId: uid,
      vaultId,
      assetId,
      originalName: file.originalname,
      sanitizedName,
      storagePath,
      contentType: file.mimetype,
      size: file.size,
      extension: extension || 'unknown',
      status: 'active',
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const assetDocRef = firestoreAdmin.collection('vaults').doc(vaultId).collection('assets').doc(assetId);

    await firestoreAdmin.runTransaction(async (transaction) => {
      transaction.set(fileDocRef, metadata);
      // Increment the parent asset's fileCount denormalized field
      transaction.update(assetDocRef, {
        fileCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return metadata;
  } catch (error) {
    console.error('Failed to complete file upload:', error.message);
    throw error;
  }
}

/**
 * Retrieve list of files for a specific asset.
 */
export async function getFiles(uid, vaultId, assetId) {
  await verifyAssetOwnership(uid, vaultId, assetId);

  const filesCollectionRef = firestoreAdmin
    .collection('vaults')
    .doc(vaultId)
    .collection('assets')
    .doc(assetId)
    .collection('files');

  const snapshot = await filesCollectionRef.get();
  return snapshot.docs.map(doc => doc.data());
}

/**
 * Get details/metadata for a single file.
 */
export async function getFileById(uid, vaultId, assetId, fileId) {
  const { fileData } = await verifyFileOwnership(uid, vaultId, assetId, fileId);
  return fileData;
}

/**
 * Generate a short-lived download URL for a file.
 */
export async function downloadFile(uid, vaultId, assetId, fileId) {
  const { fileData } = await verifyFileOwnership(uid, vaultId, assetId, fileId);
  const bucket = getBucket();
  const storageFileRef = bucket.file(fileData.storagePath);

  const [url] = await storageFileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes from now
  });

  return {
    url,
    filename: fileData.originalName,
    contentType: fileData.contentType,
  };
}

/**
 * Delete a file from Firebase Storage and remove its Firestore metadata.
 */
export async function deleteFile(uid, vaultId, assetId, fileId) {
  const { fileData, fileDocRef } = await verifyFileOwnership(uid, vaultId, assetId, fileId);
  const bucket = getBucket();

  // 1. Delete from Firebase Storage first
  try {
    const storageFileRef = bucket.file(fileData.storagePath);
    const [exists] = await storageFileRef.exists();
    if (exists) {
      await storageFileRef.delete();
    }
  } catch (storageError) {
    console.error('Storage file deletion failed:', storageError.message);
    throw new Error(`Failed to delete actual file from storage: ${storageError.message}`);
  }

  // 2. Delete Firestore metadata and decrement fileCount on parent asset
  try {
    const assetDocRef = firestoreAdmin.collection('vaults').doc(vaultId).collection('assets').doc(assetId);

    await firestoreAdmin.runTransaction(async (transaction) => {
      transaction.delete(fileDocRef);
      transaction.update(assetDocRef, {
        fileCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (firestoreError) {
    console.error('Firestore file metadata deletion failed:', firestoreError.message);
    throw new Error(`File deleted from storage, but failed to remove metadata: ${firestoreError.message}`);
  }

  return { id: fileId, deleted: true };
}
