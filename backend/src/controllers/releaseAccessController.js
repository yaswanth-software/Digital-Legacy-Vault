import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { downloadFile } from '../services/fileService.js';
import { FieldValue } from 'firebase-admin/firestore';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Helper to find a specific subdocument snapshot by ID across all vaults.
 */
async function findSubdocumentById(subcollectionName, docId) {
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
 * Log access events to vaults/{vaultId}/releaseAccessLogs
 */
async function logReleaseAccess(vaultId, ownerId, actorId, releaseId, assetId, fileId, action) {
  try {
    const logRef = vaultsCollection.doc(vaultId).collection('releaseAccessLogs').doc();
    await logRef.set({
      id: logRef.id,
      ownerId,
      vaultId,
      actorId,
      releaseId,
      assetId,
      fileId: fileId || null,
      action, // release_accessed | release_downloaded
      timestamp: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log release access:', error.message);
  }
}

/**
 * GET /api/releases/:releaseId/assets
 * Get the list of assets in a release, respecting accessLevel.
 */
export async function getReleaseAssets(req, res, next) {
  try {
    const { uid } = req.user;
    const { id: releaseId } = req.params;

    // 1. Fetch release
    const releaseDoc = await findSubdocumentById('releases', releaseId);
    if (!releaseDoc) {
      return res.status(404).json({ success: false, message: 'Release not found.' });
    }

    const release = releaseDoc.data();

    // 2. Security Check: Recipient check
    if (release.recipientId !== uid) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // 3. Status Check: Active & Expiry check
    if (release.status !== 'active') {
      return res.status(403).json({ success: false, message: `Access denied. Release is ${release.status}.` });
    }

    const expiresAt = release.expiresAt.toDate ? release.expiresAt.toDate() : new Date(release.expiresAt);
    if (expiresAt < new Date()) {
      return res.status(403).json({ success: false, message: 'Access denied. Release has expired.' });
    }

    // 4. Fetch Asset details
    const assets = [];
    for (const assetId of release.assetIds) {
      const assetDoc = await vaultsCollection.doc(release.vaultId).collection('assets').doc(assetId).get();
      
      if (assetDoc.exists) {
        const asset = assetDoc.data();

        // Strip file details entirely if accessLevel is metadata_only
        if (release.accessLevel === 'metadata_only') {
          assets.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            assetType: asset.assetType,
            description: asset.description,
            priority: asset.priority,
            tags: asset.tags,
            notes: '', // block notes for metadata_only
            files: []
          });
        } else {
          // Fetch files
          const filesSnapshot = await vaultsCollection
            .doc(release.vaultId)
            .collection('assets')
            .doc(assetId)
            .collection('files')
            .get();

          const files = filesSnapshot.docs.map(doc => {
            const file = doc.data();
            return {
              id: file.id,
              originalName: file.originalName,
              size: file.size,
              extension: file.extension,
              uploadedAt: file.uploadedAt
            };
          });

          assets.push({
            ...asset,
            files
          });
        }
      }
    }

    res.json({ success: true, data: { assets } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/releases/:releaseId/assets/:assetId
 * Retrieve detailed metadata for a specific released asset.
 */
export async function getReleaseAssetDetails(req, res, next) {
  try {
    const { uid } = req.user;
    const { releaseId, assetId } = req.params;

    const releaseDoc = await findSubdocumentById('releases', releaseId);
    if (!releaseDoc) {
      return res.status(404).json({ success: false, message: 'Release not found.' });
    }

    const release = releaseDoc.data();

    if (release.recipientId !== uid || !release.assetIds.includes(assetId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (release.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Access denied. Release is not active.' });
    }

    const expiresAt = release.expiresAt.toDate ? release.expiresAt.toDate() : new Date(release.expiresAt);
    if (expiresAt < new Date()) {
      return res.status(403).json({ success: false, message: 'Access denied. Release has expired.' });
    }

    const assetDoc = await vaultsCollection.doc(release.vaultId).collection('assets').doc(assetId).get();
    if (!assetDoc.exists) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const asset = assetDoc.data();
    if (release.accessLevel === 'metadata_only') {
      return res.json({
        success: true,
        data: {
          asset: {
            id: asset.id,
            name: asset.name,
            category: asset.category,
            assetType: asset.assetType,
            description: asset.description,
            priority: asset.priority,
            tags: asset.tags,
            files: []
          }
        }
      });
    }

    // Fetch files
    const filesSnapshot = await vaultsCollection
      .doc(release.vaultId)
      .collection('assets')
      .doc(assetId)
      .collection('files')
      .get();

    const files = filesSnapshot.docs.map(doc => doc.data());

    res.json({
      success: true,
      data: {
        asset: {
          ...asset,
          files
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/releases/:releaseId/assets/:assetId/files/:fileId/access
 * Generate a 5-minute secure signed URL for a file in a release.
 */
export async function getSecureFileAccess(req, res, next) {
  try {
    const { uid } = req.user;
    const { releaseId, assetId, fileId } = req.params;
    const { action } = req.query; // 'view' or 'download'

    // 1. Fetch release
    const releaseDoc = await findSubdocumentById('releases', releaseId);
    if (!releaseDoc) {
      return res.status(404).json({ success: false, message: 'Release not found.' });
    }

    const release = releaseDoc.data();

    // 2. Security Check: Recipient check & Asset check
    if (release.recipientId !== uid || !release.assetIds.includes(assetId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // 3. Status Check: Active & Expiry check
    if (release.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Access denied. Release is not active.' });
    }

    const expiresAt = release.expiresAt.toDate ? release.expiresAt.toDate() : new Date(release.expiresAt);
    if (expiresAt < new Date()) {
      return res.status(403).json({ success: false, message: 'Access denied. Release has expired.' });
    }

    // 4. Access Level Check
    if (release.accessLevel === 'metadata_only') {
      return res.status(403).json({ success: false, message: 'Access denied. Metadata access level does not allow file operations.' });
    }

    if (action === 'download' && release.accessLevel !== 'download') {
      return res.status(403).json({ success: false, message: 'Access denied. Download permission not granted for this release.' });
    }

    // 5. Generate signed URL
    const fileResult = await downloadFile(release.ownerId, release.vaultId, assetId, fileId);

    // 6. Log access audit event
    const logAction = action === 'download' ? 'release_downloaded' : 'release_accessed';
    await logReleaseAccess(release.vaultId, release.ownerId, uid, releaseId, assetId, fileId, logAction);

    res.json({
      success: true,
      data: fileResult
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
