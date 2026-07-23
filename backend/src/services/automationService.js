import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { createNotification } from './notificationService.js';
import { logAuditEvent } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Scan all active vaults and send automated reminders & alerts.
 */
export async function runAllAutomationProcessors() {
  if (!vaultsCollection) return { success: false, message: 'Firestore not initialized.' };

  const results = {
    checkInReminders: 0,
    gracePeriodWarnings: 0,
    releaseExpirationWarnings: 0,
    processedAt: new Date().toISOString(),
  };

  try {
    const vaultsSnap = await vaultsCollection.get();

    for (const vaultDoc of vaultsSnap.docs) {
      const vaultId = vaultDoc.id;
      const ownerId = vaultDoc.data().ownerId;

      // 1. Process Check-In Reminders
      const settingsDoc = await vaultDoc.ref.collection('continuitySettings').doc('default').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings.status === 'due') {
          await createNotification(ownerId, {
            type: 'check_in_due',
            category: 'continuity',
            priority: 'high',
            title: 'Action Required: Check-In Due',
            message: 'Your scheduled legacy check-in is due. Please confirm you are active to maintain your vault status.',
            actionUrl: '/continuity',
            relatedResourceType: 'continuity',
            relatedResourceId: vaultId,
          });
          results.checkInReminders++;
        } else if (settings.status === 'reminder_sent' || settings.status === 'grace_period') {
          await createNotification(ownerId, {
            type: 'grace_period_started',
            category: 'continuity',
            priority: 'critical',
            title: '⚠️ Grace Period Running: Check-In Overdue',
            message: 'Your check-in is overdue and grace period is running. Immediate confirmation is recommended.',
            actionUrl: '/continuity',
            relatedResourceType: 'continuity',
            relatedResourceId: vaultId,
          });
          results.gracePeriodWarnings++;
        }
      }

      // 2. Process Release Expiration Warnings
      const releasesSnap = await vaultDoc.ref.collection('releases').where('status', '==', 'active').get();
      const now = new Date();
      for (const rDoc of releasesSnap.docs) {
        const rel = rDoc.data();
        const expiresAt = rel.expiresAt.toDate ? rel.expiresAt.toDate() : new Date(rel.expiresAt);
        const diffHours = (expiresAt - now) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24) {
          await createNotification(rel.recipientId, {
            type: 'release_expiring_soon',
            category: 'releases',
            priority: 'high',
            title: '⏱ Legacy Access Expiring Soon',
            message: `Your temporary access to legacy assets will expire in less than 24 hours.`,
            actionUrl: `/my-releases/${rel.id}`,
            relatedResourceType: 'release',
            relatedResourceId: rel.id,
          });
          results.releaseExpirationWarnings++;
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Automation processor error:', error.message);
    return { success: false, error: error.message };
  }
}
