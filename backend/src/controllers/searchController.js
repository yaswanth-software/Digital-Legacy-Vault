import * as searchService from '../services/searchService.js';

export async function searchVault(req, res, next) {
  try {
    const { uid } = req.user;
    const { q } = req.query;
    const results = await searchService.globalSearch(uid, q);
    res.json({ success: true, data: { results } });
  } catch (error) {
    next(error);
  }
}
