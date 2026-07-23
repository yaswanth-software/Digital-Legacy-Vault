import * as securityEventService from '../services/securityEventService.js';

export async function getSecurityOverview(req, res, next) {
  try {
    const { uid } = req.user;
    const overview = await securityEventService.getSecurityOverview(uid);
    res.json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
}

export async function getSecurityEvents(req, res, next) {
  try {
    const { uid } = req.user;
    const events = await securityEventService.getSecurityEvents(uid);
    res.json({ success: true, data: { events } });
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeSecurityEvent(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await securityEventService.acknowledgeSecurityEvent(uid, id);
    res.json({ success: true, message: 'Security event acknowledged.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
