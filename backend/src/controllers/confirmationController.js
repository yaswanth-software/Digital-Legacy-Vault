import * as confirmationService from '../services/confirmationService.js';

export async function getConfirmations(req, res, next) {
  try {
    const { uid } = req.user;
    const confirmations = await confirmationService.getConfirmations(uid);
    res.json({ success: true, data: { confirmations } });
  } catch (error) {
    next(error);
  }
}

export async function getConfirmationById(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { vaultId } = req.query;

    if (!vaultId) {
      return res.status(400).json({ success: false, message: 'vaultId query parameter is required.' });
    }

    const confirmation = await confirmationService.getConfirmationById(uid, vaultId, id);
    res.json({ success: true, data: { confirmation } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function confirm(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { vaultId } = req.body;

    if (!vaultId) {
      return res.status(400).json({ success: false, message: 'vaultId is required in the request body.' });
    }

    const confirmation = await confirmationService.respondToConfirmation(uid, vaultId, id, 'confirmed');
    res.json({ success: true, message: 'Unavailability confirmed.', data: { confirmation } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function decline(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { vaultId } = req.body;

    if (!vaultId) {
      return res.status(400).json({ success: false, message: 'vaultId is required in the request body.' });
    }

    const confirmation = await confirmationService.respondToConfirmation(uid, vaultId, id, 'declined');
    res.json({ success: true, message: 'Confirmation request declined.', data: { confirmation } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
