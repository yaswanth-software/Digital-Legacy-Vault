import * as analyticsService from './services/analyticsService.js';
import * as notificationService from './services/notificationService.js';
import * as searchService from './services/searchService.js';
import * as activityService from './services/activityService.js';
import * as automationService from './services/automationService.js';

async function runDay8Tests() {
  console.log('🚀 Starting Day 8 Verification Test Harness...');
  const testUid = 'test_day8_user_888';

  try {
    // 1. Analytics & Readiness Score Verification
    console.log('\n--- 1. Analytics & Readiness Score Verification ---');
    const analytics = await analyticsService.getDashboardAnalytics(testUid);
    console.log('✓ Dashboard Analytics retrieved:', {
      readinessScore: analytics.readinessScore,
      readinessTier: analytics.readinessTier,
      healthStatus: analytics.healthStatus,
      protectionPercentage: analytics.vaultHealth.protectionPercentage,
      nextStepsCount: analytics.nextSteps.length,
    });

    if (typeof analytics.readinessScore !== 'number' || analytics.readinessScore < 0 || analytics.readinessScore > 100) {
      throw new Error('Invalid readiness score range!');
    }

    // 2. Smart Notification System Verification
    console.log('\n--- 2. Smart Notification System Verification ---');
    const notif = await notificationService.createNotification(testUid, {
      type: 'test_alert',
      category: 'security',
      priority: 'high',
      title: 'Security Alert: New Sign-in',
      message: 'New sign-in detected from IP 192.168.1.1',
      actionUrl: '/security',
    });
    console.log('✓ Notification created:', notif.id, 'Category:', notif.category, 'Priority:', notif.priority);

    const unreadCount = await notificationService.getUnreadCount(testUid);
    console.log('✓ Unread notification count:', unreadCount);

    const prefs = await notificationService.updateNotificationPreferences(testUid, {
      emailNotifications: false,
      securityAlerts: false, // Should be forced true!
    });
    if (prefs.securityAlerts !== true) {
      throw new Error('Security requirement violated: Security alerts were disabled!');
    }
    console.log('✓ Notification preferences updated. Security alerts status (must be true):', prefs.securityAlerts);

    // 3. Global Search Verification
    console.log('\n--- 3. Authorized Global Search Verification ---');
    const searchRes = await searchService.globalSearch(testUid, 'test');
    console.log('✓ Global search executed cleanly. Total matching items:', searchRes.totalCount);

    // 4. Activity Log Aggregation
    console.log('\n--- 4. Activity Log Aggregation Verification ---');
    const activityLogs = await activityService.getActivityLogs(testUid, { category: 'all', limit: 10 });
    console.log('✓ Activity logs retrieved. Records count:', activityLogs.length);

    // 5. Automation Processor Test
    console.log('\n--- 5. Automated Reminders Processor Verification ---');
    const autoRes = await automationService.runAllAutomationProcessors();
    console.log('✓ Automation processor finished cleanly:', autoRes);

    // Clean up test notification
    if (notif?.id) {
      await notificationService.deleteNotification(testUid, notif.id);
    }

    console.log('\n🎉 All Day 8 Product Polish & Automation assertions SATISFIED cleanly!');
  } catch (error) {
    console.error('✗ Day 8 test suite failed:', error.message);
  }
}

runDay8Tests();
