import { firestoreAdmin, storageAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getAssetById } from './assetService.js';
import env from '../config/env.js';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

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
 * Upload a single file buffer to Firebase Storage or local disk fallback.
 */
export async function uploadFile(uid, vaultId, assetId, file) {
  const asset = await verifyAssetOwnership(uid, vaultId, assetId);
  const fileId = firestoreAdmin.collection('vaults').doc().id;

  const parsedName = file.originalname.split('.');
  const extension = parsedName.length > 1 ? parsedName.pop().toLowerCase() : '';
  const sanitizedBase = parsedName.join('.')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 100);
  const sanitizedName = extension ? `${sanitizedBase}.${extension}` : sanitizedBase;

  const storagePath = `users/${uid}/vaults/${vaultId}/assets/${assetId}/files/${fileId}_${sanitizedName}`;

  let storageProvider = 'firebase';
  let isLocalFallback = false;

  // Try Firebase Storage first, fallback to local filesystem if bucket not found or unprovisioned
  try {
    const bucket = getBucket();
    const storageFileRef = bucket.file(storagePath);
    await storageFileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });
  } catch (storageError) {
    console.warn('⚠️ Cloud Storage unavailable or bucket not found. Using local disk storage fallback:', storageError.message);
    const localUploadDir = resolve(process.cwd(), 'uploads', 'users', uid, 'assets', assetId);
    mkdirSync(localUploadDir, { recursive: true });
    const localFilePath = resolve(localUploadDir, `${fileId}_${sanitizedName}`);
    writeFileSync(localFilePath, file.buffer);
    storageProvider = 'local';
    isLocalFallback = true;
  }

  try {
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
      storageProvider,
      isLocalFallback,
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
      transaction.update(assetDocRef, {
        fileCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return metadata;
  } catch (error) {
    console.error('Failed to save file metadata:', error.message);
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
 * Generate a short-lived download URL or return local file info.
 */
export async function downloadFile(uid, vaultId, assetId, fileId) {
  const { fileData } = await verifyFileOwnership(uid, vaultId, assetId, fileId);

  // Check local filesystem first if local fallback was used
  const localUploadDir = resolve(process.cwd(), 'uploads', 'users', uid, 'assets', assetId);
  const localFilePath = resolve(localUploadDir, `${fileId}_${fileData.sanitizedName}`);

  if (fileData.storageProvider === 'local' || fileData.isLocalFallback || existsSync(localFilePath)) {
    if (existsSync(localFilePath)) {
      return {
        isLocal: true,
        localFilePath,
        filename: fileData.originalName,
        contentType: fileData.contentType,
      };
    }
  }

  // Otherwise, use Firebase Storage signed URL
  try {
    const bucket = getBucket();
    const storageFileRef = bucket.file(fileData.storagePath);
    const [url] = await storageFileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    });

    return {
      url,
      filename: fileData.originalName,
      contentType: fileData.contentType,
    };
  } catch (err) {
    if (existsSync(localFilePath)) {
      return {
        isLocal: true,
        localFilePath,
        filename: fileData.originalName,
        contentType: fileData.contentType,
      };
    }
    throw err;
  }
}

/**
 * Delete a file from Firebase Storage or local disk and remove Firestore metadata.
 */
export async function deleteFile(uid, vaultId, assetId, fileId) {
  const { fileData, fileDocRef } = await verifyFileOwnership(uid, vaultId, assetId, fileId);

  // 1. Try deleting from local filesystem
  try {
    const localUploadDir = resolve(process.cwd(), 'uploads', 'users', uid, 'assets', assetId);
    const localFilePath = resolve(localUploadDir, `${fileId}_${fileData.sanitizedName}`);
    if (existsSync(localFilePath)) {
      unlinkSync(localFilePath);
    }
  } catch (localError) {
    console.warn('Local file cleanup note:', localError.message);
  }

  // 2. Try deleting from Firebase Storage
  try {
    const bucket = getBucket();
    const storageFileRef = bucket.file(fileData.storagePath);
    const [exists] = await storageFileRef.exists();
    if (exists) {
      await storageFileRef.delete();
    }
  } catch (storageError) {
    // Ignore Cloud Storage error if file was handled locally
  }

  // 3. Delete Firestore metadata and decrement fileCount on parent asset
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
    throw new Error(`File deleted, but failed to remove metadata: ${firestoreError.message}`);
  }

  return { id: fileId, deleted: true };
}
