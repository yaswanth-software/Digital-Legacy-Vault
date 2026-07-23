import * as continuityService from '../services/continuityService.js';

export async function getSettings(req, res, next) {
  try {
    const { uid } = req.user;
    const settings = await continuityService.getSettings(uid);
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { uid } = req.user;
    const settings = await continuityService.updateSettings(uid, req.body);
    res.json({ success: true, message: 'Settings updated successfully.', data: { settings } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function checkIn(req, res, next) {
  try {
    const { uid } = req.user;
    const { method } = req.body;
    const settings = await continuityService.checkIn(uid, method || 'manual');
    res.json({
      success: true,
      message: 'Check-in successful. Your Legacy Vault is marked as active.',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req, res, next) {
  try {
    const { uid } = req.user;
    const settings = await continuityService.getSettings(uid);
    res.json({
      success: true,
      data: {
        status: settings.status,
        lastCheckInAt: settings.lastCheckInAt,
        nextCheckInDueAt: settings.nextCheckInDueAt,
        gracePeriodDays: settings.gracePeriodDays,
        missedCheckInCount: settings.missedCheckInCount,
        reminderCount: settings.reminderCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req, res, next) {
  try {
    const { uid } = req.user;
    const history = await continuityService.getHistory(uid);
    res.json({ success: true, data: { history } });
  } catch (error) {
    next(error);
  }
}

export async function pause(req, res, next) {
  try {
    const { uid } = req.user;
    const settings = await continuityService.pauseContinuity(uid);
    res.json({ success: true, message: 'Continuity monitoring has been paused.', data: { settings } });
  } catch (error) {
    next(error);
  }
}

export async function resume(req, res, next) {
  try {
    const { uid } = req.user;
    const settings = await continuityService.resumeContinuity(uid);
    res.json({ success: true, message: 'Continuity monitoring resumed.', data: { settings } });
  } catch (error) {
    next(error);
  }
}
