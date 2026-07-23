import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Get aggregated intelligence analytics for the user's dashboard.
 */
export async function getDashboardAnalytics(uid) {
  const vault = await getOrCreatePrimaryVault(uid);
  const vaultRef = vaultsCollection.doc(vault.id);

  // 1. Fetch Collections
  const [assetsSnap, tpSnap, rulesSnap, settingsDoc, releasesSnap, emergencySnap, eventsSnap] = await Promise.all([
    vaultRef.collection('assets').get(),
    vaultRef.collection('trustedPeople').get(),
    vaultRef.collection('legacyRules').get(),
    vaultRef.collection('continuitySettings').doc('default').get(),
    vaultRef.collection('releases').get(),
    vaultRef.collection('emergencyRequests').get(),
    vaultRef.collection('securityEvents').where('acknowledged', '==', false).get(),
  ]);

  const assets = assetsSnap.docs.map(d => d.data());
  const trustedPeople = tpSnap.docs.map(d => d.data());
  const rules = rulesSnap.docs.map(d => d.data());
  const settings = settingsDoc.exists ? settingsDoc.data() : { status: 'active' };
  const releases = releasesSnap.docs.map(d => d.data());
  const emergencyRequests = emergencySnap.docs.map(d => d.data());
  const unacknowledgedEvents = eventsSnap.docs.map(d => d.data());

  const activeAssets = assets.filter(a => a.status === 'active');
  const archivedAssets = assets.filter(a => a.status === 'archived');
  const activeTP = trustedPeople.filter(tp => tp.status === 'active' && !tp.removedAt && tp.invitationStatus === 'accepted');
  const pendingTP = trustedPeople.filter(tp => tp.invitationStatus === 'pending');
  const activeRules = rules.filter(r => r.status === 'active' || r.status === 'eligible');

  // Assets mapped in active rules
  const ruleMappedAssetIds = new Set(activeRules.flatMap(r => r.assetIds));
  const ruleMappedTpIds = new Set(activeRules.flatMap(r => r.trustedPersonIds));

  const unprotectedAssets = activeAssets.filter(a => !ruleMappedAssetIds.has(a.id));
  const protectedAssetsCount = activeAssets.length - unprotectedAssets.length;
  const vaultProtectionPercentage = activeAssets.length > 0
    ? Math.round((protectedAssetsCount / activeAssets.length) * 100)
    : 0;

  // 2. Calculate Legacy Readiness Score (0 - 100)
  let readinessScore = 10; // Base: Vault initialized

  if (activeAssets.length >= 1) readinessScore += 15;
  if (activeAssets.length >= 5) readinessScore += 10;
  if (activeTP.length >= 1) readinessScore += 20;
  if (ruleMappedTpIds.size >= 1) readinessScore += 15;
  if (activeRules.length >= 1) readinessScore += 15;
  if (settings.status === 'active') readinessScore += 15;

  readinessScore = Math.min(100, readinessScore);

  let readinessTier = 'Getting Started';
  if (readinessScore > 30 && readinessScore <= 60) readinessTier = 'In Progress';
  if (readinessScore > 60 && readinessScore <= 85) readinessTier = 'Well Prepared';
  if (readinessScore > 85) readinessTier = 'Legacy Ready';

  // 3. Calculate Legacy Health Score
  let healthStatus = 'healthy';
  let healthReason = 'All legacy systems operating normally.';

  if (settings.status === 'due' || unacknowledgedEvents.length > 0 || pendingTP.length > 0) {
    healthStatus = 'needs_attention';
    healthReason = 'Attention required: check-in is due, alerts pending, or invitations unaccepted.';
  }

  if (settings.status === 'reminder_sent' || settings.status === 'grace_period' || settings.status === 'missed') {
    healthStatus = 'at_risk';
    healthReason = 'Vault continuity is at risk: owner check-in is overdue or grace period is active.';
  }

  // 4. Generate Actionable Recommended Next Steps
  const nextSteps = [];

  if (activeAssets.length === 0) {
    nextSteps.push({
      id: 'add_asset',
      priority: 'high',
      title: 'Add Your First Digital Asset',
      description: 'Upload financial documents, legal records, or account credentials to your secure vault.',
      actionUrl: '/vault/assets/new',
      actionText: 'Add Asset',
    });
  }

  if (activeTP.length === 0) {
    nextSteps.push({
      id: 'add_trusted_person',
      priority: 'high',
      title: 'Designate a Trusted Person',
      description: 'Invite family members or executors who should inherit or manage asset access.',
      actionUrl: '/trusted-people/new',
      actionText: 'Invite Person',
    });
  }

  if (activeAssets.length > 0 && activeRules.length === 0) {
    nextSteps.push({
      id: 'create_rule',
      priority: 'high',
      title: 'Configure a Legacy Release Rule',
      description: 'Define conditions for when and to whom selected vault assets should be released.',
      actionUrl: '/legacy-rules/new',
      actionText: 'Create Rule',
    });
  }

  if (unprotectedAssets.length > 0 && activeRules.length > 0) {
    nextSteps.push({
      id: 'protect_unprotected_assets',
      priority: 'medium',
      title: `Protect ${unprotectedAssets.length} Unprotected Assets`,
      description: 'You have assets in your vault that are not assigned to any active Legacy Rule.',
      actionUrl: '/legacy-rules',
      actionText: 'Assign Rules',
    });
  }

  if (settings.status === 'due') {
    nextSteps.push({
      id: 'check_in_now',
      priority: 'critical',
      title: 'Perform Check-In',
      description: 'Your monthly legacy continuity check-in is due. Click to confirm you are active.',
      actionUrl: '/continuity',
      actionText: 'Check In Now',
    });
  }

  // Setup Checklist Progress
  const setupChecklist = [
    { label: 'Vault Initialized', completed: true, path: '/vault' },
    { label: 'First Asset Added', completed: activeAssets.length > 0, path: '/vault/assets/new' },
    { label: 'Trusted Person Designated', completed: activeTP.length > 0, path: '/trusted-people' },
    { label: 'Legacy Release Rule Configured', completed: activeRules.length > 0, path: '/legacy-rules' },
    { label: 'Continuity Check-in Active', completed: settings.status === 'active', path: '/continuity' },
    { label: 'Security Reviewed', completed: true, path: '/security' },
  ];

  return {
    vaultId: vault.id,
    readinessScore,
    readinessTier,
    healthStatus,
    healthReason,
    vaultHealth: {
      totalAssets: assets.length,
      activeAssets: activeAssets.length,
      archivedAssets: archivedAssets.length,
      protectedAssets: protectedAssetsCount,
      unprotectedAssets: unprotectedAssets.length,
      protectionPercentage: vaultProtectionPercentage,
    },
    trustedPeopleSummary: {
      total: trustedPeople.length,
      active: activeTP.length,
      pending: pendingTP.length,
    },
    legacyRulesSummary: {
      total: rules.length,
      active: activeRules.length,
      pendingVerification: rules.filter(r => r.status === 'verification_pending').length,
    },
    emergencySummary: {
      pending: emergencyRequests.filter(r => r.status === 'pending').length,
      released: emergencyRequests.filter(r => r.status === 'released').length,
    },
    releasesSummary: {
      active: releases.filter(r => r.status === 'active').length,
      expired: releases.filter(r => r.status === 'expired').length,
      revoked: releases.filter(r => r.status === 'revoked').length,
    },
    securitySummary: {
      unacknowledgedAlerts: unacknowledgedEvents.length,
    },
    nextSteps,
    setupChecklist,
  };
}
