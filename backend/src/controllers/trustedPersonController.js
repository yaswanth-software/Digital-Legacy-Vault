import * as trustedPersonService from '../services/trustedPersonService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';

/**
 * POST /api/trusted-people
 * Create a new trusted person and send invite.
 */
export async function createTrustedPerson(req, res, next) {
  try {
    const { uid, email: ownerEmail, name: ownerName } = req.user;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await trustedPersonService.createTrustedPerson(
      uid,
      ownerEmail,
      ownerName,
      vault.id,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Trusted person added and invitation email queued.',
      data: { trustedPerson: result },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/trusted-people
 * List all trusted people in the owner's vault.
 */
export async function getTrustedPeople(req, res, next) {
  try {
    const { uid } = req.user;
    const vault = await getOrCreatePrimaryVault(uid);

    const trustedPeople = await trustedPersonService.getTrustedPeople(uid, vault.id, req.query);

    res.json({
      success: true,
      data: { trustedPeople },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/trusted-people/:id
 * Retrieve details of a trusted person.
 */
export async function getTrustedPersonById(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const trustedPerson = await trustedPersonService.getTrustedPersonById(uid, vault.id, id);

    res.json({
      success: true,
      data: { trustedPerson },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/trusted-people/:id
 * Update trusted person information.
 */
export async function updateTrustedPerson(req, res, next) {
  try {
    const { uid, name: ownerName, email: ownerEmail } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await trustedPersonService.updateTrustedPerson(
      uid,
      ownerName,
      ownerEmail,
      vault.id,
      id,
      req.body
    );

    res.json({
      success: true,
      message: 'Trusted person updated successfully.',
      data: { trustedPerson: result },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/trusted-people/:id/revoke
 * Permanently revoke trust.
 */
export async function revokeTrustedPerson(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await trustedPersonService.revokeTrustedPerson(uid, vault.id, id);

    res.json({
      success: true,
      message: 'Trusted person access revoked and permissions removed.',
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/trusted-people/:id
 * Soft remove a trusted person.
 */
export async function softRemoveTrustedPerson(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await trustedPersonService.softRemoveTrustedPerson(uid, vault.id, id);

    res.json({
      success: true,
      message: 'Trusted person removed successfully.',
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}
