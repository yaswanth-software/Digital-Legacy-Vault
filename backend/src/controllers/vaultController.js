import { getOrCreatePrimaryVault, updateVault } from '../services/vaultService.js';
import { firestoreAdmin } from '../config/firebaseAdmin.js';

/**
 * GET /api/vault
 * Returns the authenticated user's primary vault, creating it if it doesn't exist.
 */
export async function getVault(req, res, next) {
  try {
    const uid = req.user.uid;
    const vault = await getOrCreatePrimaryVault(uid);
    res.json({
      success: true,
      data: { vault },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/vault
 * Creates a primary vault if one doesn't exist. Returns 400 if one already exists.
 */
export async function createVault(req, res, next) {
  try {
    const uid = req.user.uid;

    const querySnapshot = await firestoreAdmin.collection('vaults')
      .where('ownerId', '==', uid)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Primary vault already exists.',
        data: { vault: querySnapshot.docs[0].data() },
      });
    }

    const vault = await getOrCreatePrimaryVault(uid);
    res.status(201).json({
      success: true,
      data: { vault },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/vault
 * Updates name or description of the primary vault.
 */
export async function patchVault(req, res, next) {
  try {
    const uid = req.user.uid;
    const { name, description } = req.body;

    // Get the primary vault first to find its ID
    const vault = await getOrCreatePrimaryVault(uid);
    const updatedVault = await updateVault(uid, vault.id, { name, description });

    res.json({
      success: true,
      data: { vault: updatedVault },
    });
  } catch (error) {
    next(error);
  }
}
