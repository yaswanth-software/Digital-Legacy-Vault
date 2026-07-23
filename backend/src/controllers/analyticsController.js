import * as analyticsService from '../services/analyticsService.js';

export async function getDashboardOverview(req, res, next) {
  try {
    const { uid } = req.user;
    const analytics = await analyticsService.getDashboardAnalytics(uid);
    res.json({ success: true, data: { analytics } });
  } catch (error) {
    next(error);
  }
}
