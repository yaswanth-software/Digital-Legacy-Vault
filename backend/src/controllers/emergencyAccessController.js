import * as emergencyAccessService from '../services/emergencyAccessService.js';

export async function getAvailableAssets(req, res, next) {
  try {
    const { uid } = req.user;
    const assets = await emergencyAccessService.getAvailableAssets(uid);
    res.json({ success: true, data: { assets } });
  } catch (error) {
    next(error);
  }
}

export async function createEmergencyRequest(req, res, next) {
  try {
    const { uid } = req.user;
    const result = await emergencyAccessService.createEmergencyRequest(uid, req.body);
    res.status(201).json({
      success: true,
      message: 'Your emergency access request has been submitted. Access will only be granted after the required verification process is completed.',
      data: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function getRequestsSubmittedBy(req, res, next) {
  try {
    const { uid } = req.user;
    const requests = await emergencyAccessService.getRequestsSubmittedBy(uid);
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
}

export async function getIncomingRequests(req, res, next) {
  try {
    const { uid } = req.user;
    const requests = await emergencyAccessService.getIncomingRequests(uid);
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
}

export async function getRequestDetails(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const request = await emergencyAccessService.getRequestDetails(uid, id);
    res.json({ success: true, data: { request } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await emergencyAccessService.approveRequest(uid, id);
    res.json({ success: true, message: 'Emergency request approved successfully.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function denyRequest(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await emergencyAccessService.denyRequest(uid, id);
    res.json({ success: true, message: 'Emergency request denied.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function requestVerification(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { level } = req.body;
    const result = await emergencyAccessService.requestVerification(uid, id, level);
    res.json({ success: true, message: 'Verification required level updated.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
