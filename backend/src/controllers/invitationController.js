import * as invitationService from '../services/invitationService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';

/**
 * POST /api/trusted-people/:id/resend-invitation
 * Resends the invitation with a refreshed token and expiry.
 */
export async function resendInvitation(req, res, next) {
  try {
    const { uid, name: ownerName, email: ownerEmail } = req.user;
    const { id } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await invitationService.resendInvitation(
      uid,
      ownerName,
      ownerEmail,
      vault.id,
      id
    );

    res.json({
      success: true,
      message: 'Invitation email resent successfully.',
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
 * GET /api/invitations/preview?token=...
 * Public route to retrieve inviter details before signing in.
 */
export async function previewInvitation(req, res, next) {
  try {
    const { token, vaultId, id } = req.query;

    const preview = await invitationService.previewInvitation(token, vaultId, id);

    res.json({
      success: true,
      data: { preview },
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
 * POST /api/invitations/accept
 * Secure route to accept the invitation and link with current user account.
 */
export async function acceptInvitation(req, res, next) {
  try {
    const { uid, email: userEmail } = req.user;
    const { token, vaultId, id } = req.body;

    const result = await invitationService.acceptInvitation(uid, userEmail, token, vaultId, id);

    res.json({
      success: true,
      message: 'Invitation accepted successfully.',
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
