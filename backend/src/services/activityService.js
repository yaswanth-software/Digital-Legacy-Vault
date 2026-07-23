import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Fetch consolidated activity timeline logs across Vault, Trusted People, Legacy Rules, Continuity, Emergency, and Security.
 */
export async function getActivityLogs(uid, options = {}) {
  const { category, search, limit = 50 } = options;
  const vault = await getOrCreatePrimaryVault(uid);

  const vaultRef = vaultsCollection.doc(vault.id);

  // 1. Fetch Audit Logs
  let auditSnap = await vaultRef.collection('auditLogs')
    .orderBy('timestamp', 'desc')
    .limit(limit * 2)
    .get();

  let logs = auditSnap.docs.map(d => d.data());

  // 2. Fetch Security Events
  let secSnap = await vaultRef.collection('securityEvents')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const secEvents = secSnap.docs.map(d => {
    const ev = d.data();
    return {
      id: ev.id,
      vaultId: ev.vaultId,
      actorId: ev.ownerId,
      action: `security_${ev.eventType}`,
      resourceType: 'security',
      resourceId: ev.id,
      timestamp: ev.timestamp,
      severity: ev.severity,
      details: ev.details,
    };
  });

  // Combine and sort by timestamp
  let combined = [...logs, ...secEvents];
  combined.sort((a, b) => {
    const tA = a.timestamp?._seconds ? a.timestamp._seconds * 1000 : new Date(a.timestamp || 0).getTime();
    const tB = b.timestamp?._seconds ? b.timestamp._seconds * 1000 : new Date(b.timestamp || 0).getTime();
    return tB - tA;
  });

  // Category Filtering
  if (category && category !== 'all') {
    combined = combined.filter(item => {
      const resType = (item.resourceType || '').toLowerCase();
      const action = (item.action || '').toLowerCase();
      switch (category) {
        case 'vault':
        case 'assets':
          return resType.includes('asset') || action.includes('asset');
        case 'trusted_people':
          return resType.includes('trusted') || action.includes('invitation');
        case 'rules':
          return resType.includes('rule') || action.includes('rule');
        case 'continuity':
          return action.includes('check_in') || action.includes('continuity');
        case 'emergency':
          return action.includes('emergency');
        case 'releases':
          return resType.includes('release') || action.includes('release');
        case 'security':
          return resType.includes('security') || action.includes('security');
        default:
          return true;
      }
    });
  }

  // Search Filter
  if (search && search.trim() !== '') {
    const term = search.toLowerCase().trim();
    combined = combined.filter(item =>
      (item.action || '').toLowerCase().includes(term) ||
      (item.resourceType || '').toLowerCase().includes(term) ||
      (item.resourceId || '').toLowerCase().includes(term)
    );
  }

  return combined.slice(0, limit);
}
