import * as verificationService from '../services/verificationService.js';

export async function getVerificationDetails(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await verificationService.getVerificationDetails(uid, id);
    res.json({ success: true, data: { verification: result } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function startVerification(req, res, next) {
  try {
    // For manual starts if ever needed, or custom mocks.
    // For now, we can just respond with success or details.
    const { uid } = req.user;
    const { id } = req.params;
    const result = await verificationService.getVerificationDetails(uid, id);
    res.json({ success: true, message: 'Verification step started.', data: { verification: result } });
  } catch (error) {
    next(error);
  }
}

export async function completeVerificationStep(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { stepName } = req.body;

    if (!stepName) {
      return res.status(400).json({ success: false, message: 'stepName is required.' });
    }

    const result = await verificationService.completeVerificationStep(uid, id, stepName);
    res.json({
      success: true,
      message: `Verification step "${stepName}" completed successfully.`,
      data: { verification: result }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function cancelVerification(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await verificationService.cancelVerification(uid, id);
    res.json({ success: true, message: 'Verification cancelled.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
