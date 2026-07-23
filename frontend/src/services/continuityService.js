import api from './api';

/**
 * Fetch continuity configurations.
 */
export async function getSettings() {
  const response = await api.get('/continuity/settings');
  return response.data;
}

/**
 * Update check-in settings.
 */
export async function updateSettings(data) {
  const response = await api.patch('/continuity/settings', data);
  return response.data;
}

/**
 * Execute check-in to confirm activity.
 */
export async function checkIn(method = 'manual') {
  const response = await api.post('/continuity/check-in', { method });
  return response.data;
}

/**
 * Fetch current continuity timelines status.
 */
export async function getStatus() {
  const response = await api.get('/continuity/status');
  return response.data;
}

/**
 * Fetch check-in history logs list.
 */
export async function getHistory() {
  const response = await api.get('/continuity/history');
  return response.data;
}

/**
 * Pause continuity check-ins.
 */
export async function pauseContinuity() {
  const response = await api.post('/continuity/pause');
  return response.data;
}

/**
 * Resume continuity check-ins.
 */
export async function resumeContinuity() {
  const response = await api.post('/continuity/resume');
  return response.data;
}

/**
 * Fetch user notifications.
 */
export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

/**
 * Fetch unread notification counts.
 */
export async function getUnreadNotificationsCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data;
}

/**
 * Mark specific notification read.
 */
export async function markNotificationAsRead(id) {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
}
