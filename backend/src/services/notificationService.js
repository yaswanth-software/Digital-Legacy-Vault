import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const usersCollection = firestoreAdmin ? firestoreAdmin.collection('users') : null;

const CATEGORIES = ['security', 'continuity', 'legacy_rules', 'emergency_access', 'verification', 'releases', 'trusted_people', 'system'];
const PRIORITIES = ['low', 'normal', 'high', 'critical'];

/**
 * Create a new notification event for a specific user.
 */
export async function createNotification(uid, data) {
  if (!uid) return null;

  try {
    const userRef = usersCollection.doc(uid);
    const notificationsRef = userRef.collection('notifications');
    const newNotificationRef = notificationsRef.doc();
    const notificationId = newNotificationRef.id;

    const category = CATEGORIES.includes(data.category) ? data.category : 'system';
    const priority = PRIORITIES.includes(data.priority) ? data.priority : 'normal';

    const newNotification = {
      id: notificationId,
      userId: uid,
      type: data.type,
      category,
      priority,
      title: data.title,
      message: data.message,
      read: false,
      actionUrl: data.actionUrl || null,
      relatedResourceType: data.relatedResourceType || null,
      relatedResourceId: data.relatedResourceId || null,
      relatedRuleId: data.relatedRuleId || null,
      relatedVaultId: data.relatedVaultId || null,
      confirmationId: data.confirmationId || null,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    };

    await newNotificationRef.set(newNotification);
    console.log(`✓ Notification created [${category}/${priority}] for user ${uid}: ${data.title}`);

    // Trigger Email Abstraction dispatch
    await sendEmailNotification(uid, data);

    return newNotification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Email Notification Abstraction service.
 * In development, logs template dispatch safely without exposing sensitive tokens.
 */
export async function sendEmailNotification(uid, notificationData) {
  try {
    console.log(`📧 [EMAIL SERVICE] Template Dispatch -> User: ${uid} | Subject: "${notificationData.title}" | Category: ${notificationData.category}`);
  } catch (err) {
    console.error('Failed to dispatch email template:', err.message);
  }
}

/**
 * Retrieve notifications for a user with category, priority, and unread filters.
 */
export async function getNotifications(uid, options = {}) {
  const { category, priority, unreadOnly, search, limit = 50 } = options;
  const notifRef = usersCollection.doc(uid).collection('notifications');

  let query = notifRef.orderBy('createdAt', 'desc');

  if (unreadOnly) {
    query = query.where('read', '==', false);
  }

  const snapshot = await query.limit(limit * 2).get();
  let notifications = snapshot.docs.map(doc => doc.data());

  if (category && category !== 'all') {
    notifications = notifications.filter(n => n.category === category);
  }

  if (priority && priority !== 'all') {
    notifications = notifications.filter(n => n.priority === priority);
  }

  if (search && search.trim() !== '') {
    const term = search.toLowerCase().trim();
    notifications = notifications.filter(n =>
      (n.title || '').toLowerCase().includes(term) ||
      (n.message || '').toLowerCase().includes(term)
    );
  }

  return notifications.slice(0, limit);
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(uid, notificationId) {
  const notifRef = usersCollection.doc(uid).collection('notifications').doc(notificationId);
  const doc = await notifRef.get();
  if (!doc.exists) {
    const error = new Error('Notification not found.');
    error.status = 404;
    throw error;
  }

  await notifRef.update({
    read: true,
    readAt: FieldValue.serverTimestamp(),
  });

  return { id: notificationId, read: true };
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllAsRead(uid) {
  const snapshot = await usersCollection.doc(uid).collection('notifications').where('read', '==', false).get();
  const batch = firestoreAdmin.batch();

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { updatedCount: snapshot.size };
}

/**
 * Delete a notification.
 */
export async function deleteNotification(uid, notificationId) {
  const notifRef = usersCollection.doc(uid).collection('notifications').doc(notificationId);
  await notifRef.delete();
  return { id: notificationId, deleted: true };
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(uid) {
  const snapshot = await usersCollection.doc(uid).collection('notifications').where('read', '==', false).get();
  return snapshot.size;
}

/**
 * Get user notification settings.
 */
export async function getNotificationPreferences(uid) {
  const settingsDoc = await usersCollection.doc(uid).collection('settings').doc('notifications').get();
  if (!settingsDoc.exists) {
    return {
      emailNotifications: true,
      inAppNotifications: true,
      securityAlerts: true, // Non-disableable
      emergencyAccessAlerts: true,
      continuityReminders: true,
      releaseExpirationAlerts: true,
      trustedPersonUpdates: true,
    };
  }
  return settingsDoc.data();
}

/**
 * Update user notification settings.
 */
export async function updateNotificationPreferences(uid, updates) {
  const settingsRef = usersCollection.doc(uid).collection('settings').doc('notifications');
  
  // Enforce security requirement: Security Alerts cannot be disabled!
  const sanitizedUpdates = {
    ...updates,
    securityAlerts: true, // Forced true
    updatedAt: FieldValue.serverTimestamp(),
  };

  await settingsRef.set(sanitizedUpdates, { merge: true });
  const doc = await settingsRef.get();
  return doc.data();
}
