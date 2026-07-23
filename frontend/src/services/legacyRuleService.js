import api from './api';

/**
 * Retrieve all legacy rules.
 */
export async function getRules() {
  const response = await api.get('/legacy-rules');
  return response.data;
}

/**
 * Fetch a single rule's configurations.
 */
export async function getRuleById(id) {
  const response = await api.get(`/legacy-rules/${id}`);
  return response.data;
}

/**
 * Create a new rule.
 */
export async function createRule(data) {
  const response = await api.post('/legacy-rules', data);
  return response.data;
}

/**
 * Update an existing rule.
 */
export async function updateRule(id, data) {
  const response = await api.patch(`/legacy-rules/${id}`, data);
  return response.data;
}

/**
 * Delete a rule.
 */
export async function deleteRule(id) {
  const response = await api.delete(`/legacy-rules/${id}`);
  return response.data;
}

/**
 * Validate and Activate a rule.
 */
export async function activateRule(id) {
  const response = await api.post(`/legacy-rules/${id}/activate`);
  return response.data;
}

/**
 * Pause active rule.
 */
export async function pauseRule(id) {
  const response = await api.post(`/legacy-rules/${id}/pause`);
  return response.data;
}

/**
 * Run read-only evaluation simulation.
 */
export async function simulateRule(id, data) {
  const response = await api.post(`/legacy-rules/${id}/simulate`, data);
  return response.data;
}

/**
 * Evaluate rule directly.
 */
export async function evaluateRule(id) {
  const response = await api.post(`/legacy-rules/${id}/evaluate`);
  return response.data;
}

/**
 * Fetch evaluations trail history logs.
 */
export async function getRuleEvaluations(id) {
  const response = await api.get(`/legacy-rules/${id}/evaluations`);
  return response.data;
}

/**
 * Retrieve confirmation requests sent to the trusted person.
 */
export async function getConfirmations() {
  const response = await api.get('/confirmations');
  return response.data;
}

/**
 * Retrieve a single confirmation request details.
 */
export async function getConfirmationById(id, vaultId) {
  const response = await api.get(`/confirmations/${id}`, { params: { vaultId } });
  return response.data;
}

/**
 * Log unavailability confirmation response.
 */
export async function confirmUnavailability(id, vaultId) {
  const response = await api.post(`/confirmations/${id}/confirm`, { vaultId });
  return response.data;
}

/**
 * Decline a confirmation request.
 */
export async function declineConfirmation(id, vaultId) {
  const response = await api.post(`/confirmations/${id}/decline`, { vaultId });
  return response.data;
}

/**
 * Execute Controlled Release for a legacy rule.
 */
export async function executeRuleRelease(id) {
  const response = await api.post(`/legacy-rules/${id}/release`);
  return response.data;
}

