import * as activityService from '../services/activityService.js';

export async function getActivityLogs(req, res, next) {
  try {
    const { uid } = req.user;
    const { category, search, limit } = req.query;
    const logs = await activityService.getActivityLogs(uid, {
      category,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ success: true, data: { activity: logs } });
  } catch (error) {
    next(error);
  }
}
