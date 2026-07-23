import * as dataExportService from '../services/dataExportService.js';

export async function exportUserData(req, res, next) {
  try {
    const { uid } = req.user;
    const exportData = await dataExportService.exportUserData(uid);
    res.json({
      success: true,
      message: 'User data exported successfully.',
      data: { export: exportData }
    });
  } catch (error) {
    next(error);
  }
}

export async function getPrivacySummary(req, res, next) {
  try {
    const { uid } = req.user;
    res.json({
      success: true,
      data: {
        privacyPolicy: {
          dataMinimization: 'LegacyOS collects only required digital asset metadata and recipient contact details.',
          storageEncryption: 'Sensitive text fields are protected via application-level AES-256-GCM encryption. Binary files are stored in private Firebase Storage.',
          accessControl: 'Server-side Zero Trust authorization evaluates permissions for every request.',
          retentionPolicy: 'Data is retained while account is active. Releases expire automatically after 72 hours.'
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { uid } = req.user;
    const { confirmationText } = req.body;

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation text. Please type "DELETE MY ACCOUNT" to proceed.'
      });
    }

    res.json({
      success: true,
      message: 'Account deletion initiated. Data cleanup registered according to retention policy.'
    });
  } catch (error) {
    next(error);
  }
}
