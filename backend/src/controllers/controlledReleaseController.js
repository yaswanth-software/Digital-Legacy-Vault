import * as controlledReleaseService from '../services/controlledReleaseService.js';

export async function getReleases(req, res, next) {
  try {
    const { uid } = req.user;
    const { type } = req.query; // 'recipient' or 'owner'

    let releases;
    if (type === 'recipient') {
      releases = await controlledReleaseService.getReleasesForRecipient(uid);
    } else {
      releases = await controlledReleaseService.getReleasesForOwner(uid);
    }

    res.json({ success: true, data: { releases } });
  } catch (error) {
    next(error);
  }
}

export async function getReleaseDetails(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const release = await controlledReleaseService.getReleaseDetails(uid, id);
    res.json({ success: true, data: { release } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function revokeRelease(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await controlledReleaseService.revokeRelease(uid, id, reason);
    res.json({ success: true, message: 'Release access revoked successfully.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function expireReleases(req, res, next) {
  try {
    const result = await controlledReleaseService.expireReleases();
    res.json({ success: true, message: 'Release expiration check ran successfully.', data: result });
  } catch (error) {
    next(error);
  }
}

export async function getReleaseActivityLogs(req, res, next) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const logs = await controlledReleaseService.getReleaseActivityLogs(uid, id);
    res.json({ success: true, data: { logs } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
}
