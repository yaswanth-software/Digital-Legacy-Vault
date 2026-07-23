import { Router } from 'express';
import env from '../config/env.js';
import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { evaluateRule } from '../services/legacyRuleEngine.js';
import { createNotification } from '../services/notificationService.js';
import { logAuditEvent } from '../services/trustedPersonService.js';

const router = Router();

// Secure server-to-server middleware
function authenticateInternal(req, res, next) {
  // Allow header match, or bypass in local development if no key configured
  const key = req.headers['x-internal-key'];
  if (env.isProduction() || env.internalApiKey !== 'dev_secret_key') {
    if (key !== env.internalApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid internal service key.'
      });
    }
  }
  next();
}

router.post('/continuity/evaluate', authenticateInternal, async (req, res, next) => {
  try {
    console.log('🔄 Continuity Engine Evaluation Triggered...');
    const vaultsSnapshot = await firestoreAdmin.collection('vaults').get();
    const evaluatedVaults = [];

    for (const vaultDoc of vaultsSnapshot.docs) {
      const vaultId = vaultDoc.id;
      const vault = vaultDoc.data();

      // Get settings doc
      const settingsRef = firestoreAdmin
        .collection('vaults')
        .doc(vaultId)
        .collection('continuitySettings')
        .doc('default');
      
      const settingsDoc = await settingsRef.get();
      if (!settingsDoc.exists) continue;

      const settings = settingsDoc.data();
      if (settings.status === 'paused') continue;

      const now = new Date();
      const nextDue = settings.nextCheckInDueAt?.toDate ? settings.nextCheckInDueAt.toDate() : null;
      let statusChanged = false;
      const updates = {
        updatedAt: FieldValue.serverTimestamp()
      };

      if (nextDue && now > nextDue) {
        const graceDays = settings.gracePeriodDays || 14;
        const gracePeriodEnds = new Date(nextDue);
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + graceDays);

        if (now > gracePeriodEnds) {
          // Exited grace period, user is marked as MISSED
          if (settings.status !== 'missed') {
            updates.status = 'missed';
            updates.missedCheckInCount = (settings.missedCheckInCount || 0) + 1;
            updates.gracePeriodEndsAt = null;
            statusChanged = true;

            await createNotification(settings.ownerId, {
              type: 'check_in_missed',
              title: 'Legacy Action Required: Check-in Overdue',
              message: 'Your grace period has ended. The vault has entered Missed status.',
              relatedVaultId: vaultId
            });
            await logAuditEvent(vaultId, settings.ownerId, 'system', 'check_in_missed', 'vault', vaultId);
          }
        } else {
          // Still inside grace period, transition to grace_period
          if (settings.status !== 'grace_period' && settings.status !== 'reminder_sent') {
            updates.status = 'grace_period';
            updates.reminderCount = (settings.reminderCount || 0) + 1;
            updates.gracePeriodEndsAt = gracePeriodEnds;
            statusChanged = true;

            await createNotification(settings.ownerId, {
              type: 'grace_period_started',
              title: 'Urgent: Check-in Overdue',
              message: `You missed your check-in. Your grace period ends on ${gracePeriodEnds.toLocaleDateString()}.`,
              relatedVaultId: vaultId
            });
            await logAuditEvent(vaultId, settings.ownerId, 'system', 'grace_period_started', 'vault', vaultId);
          }
        }
      }

      if (statusChanged) {
        await settingsRef.update(updates);
      }

      // Evaluate active legacy rules in this vault
      const rulesSnapshot = await firestoreAdmin
        .collection('vaults')
        .doc(vaultId)
        .collection('legacyRules')
        .get();

      const ruleEvaluations = [];
      for (const ruleDoc of rulesSnapshot.docs) {
        const rule = ruleDoc.data();
        if (['active', 'triggered', 'verification_pending', 'eligible'].includes(rule.status)) {
          const evalResult = await evaluateRule(vaultId, rule.id);
          ruleEvaluations.push({ ruleId: rule.id, status: evalResult.status, result: evalResult.result });
        }
      }

      evaluatedVaults.push({
        vaultId,
        settingsStatus: updates.status || settings.status,
        rulesEvaluated: ruleEvaluations
      });
    }

    res.json({
      success: true,
      message: `Evaluated check-in cycles for ${evaluatedVaults.length} vaults.`,
      data: { evaluations: evaluatedVaults }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/automation/run', authenticateInternal, async (req, res, next) => {
  try {
    const { runAllAutomationProcessors } = await import('../services/automationService.js');
    const results = await runAllAutomationProcessors();
    res.json({ success: true, message: 'Automated reminders processor finished.', data: results });
  } catch (error) {
    next(error);
  }
});

export default router;

