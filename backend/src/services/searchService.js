import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { getOrCreatePrimaryVault } from './vaultService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

/**
 * Global search across user's authorized vault entities.
 * Returns grouped results: { assets, trustedPeople, legacyRules, releases }
 */
export async function globalSearch(uid, queryStr) {
  if (!queryStr || queryStr.trim().length < 2) {
    return { assets: [], trustedPeople: [], legacyRules: [], releases: [] };
  }

  const query = queryStr.toLowerCase().trim();
  const vault = await getOrCreatePrimaryVault(uid);
  const vaultRef = vaultsCollection.doc(vault.id);

  // 1. Search Assets
  const assetsSnap = await vaultRef.collection('assets').get();
  const assets = assetsSnap.docs
    .map(d => d.data())
    .filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      (a.description || '').toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    )
    .map(a => ({
      id: a.id,
      title: a.name,
      subtitle: `Category: ${a.category.replace(/_/g, ' ')} | Priority: ${a.priority}`,
      category: 'Assets',
      url: `/vault/assets/${a.id}`,
    }));

  // 2. Search Trusted People
  const tpSnap = await vaultRef.collection('trustedPeople').get();
  const trustedPeople = tpSnap.docs
    .map(d => d.data())
    .filter(tp =>
      !tp.removedAt &&
      (tp.fullName.toLowerCase().includes(query) ||
       tp.email.toLowerCase().includes(query) ||
       tp.relationship.toLowerCase().includes(query))
    )
    .map(tp => ({
      id: tp.id,
      title: tp.fullName,
      subtitle: `Email: ${tp.email} | Relationship: ${tp.relationship}`,
      category: 'Trusted People',
      url: `/trusted-people/${tp.id}`,
    }));

  // 3. Search Legacy Rules
  const rulesSnap = await vaultRef.collection('legacyRules').get();
  const legacyRules = rulesSnap.docs
    .map(d => d.data())
    .filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      r.status.toLowerCase().includes(query)
    )
    .map(r => ({
      id: r.id,
      title: r.name,
      subtitle: `Status: ${r.status} | Priority: ${r.priority}`,
      category: 'Legacy Rules',
      url: `/legacy-rules/${r.id}`,
    }));

  // 4. Search Active Releases (Authorized to uid as owner or recipient)
  const relSnap = await vaultRef.collection('releases').get();
  const releases = relSnap.docs
    .map(d => d.data())
    .filter(r => r.ownerId === uid || r.recipientId === uid)
    .filter(r => r.id.toLowerCase().includes(query) || r.status.toLowerCase().includes(query) || r.accessLevel.toLowerCase().includes(query))
    .map(r => ({
      id: r.id,
      title: `Release #${r.id.substring(0, 8)}`,
      subtitle: `Status: ${r.status} | Access Level: ${r.accessLevel}`,
      category: 'Releases',
      url: `/my-releases/${r.id}`,
    }));

  return {
    assets: assets.slice(0, 5),
    trustedPeople: trustedPeople.slice(0, 5),
    legacyRules: legacyRules.slice(0, 5),
    releases: releases.slice(0, 5),
    totalCount: assets.length + trustedPeople.length + legacyRules.length + releases.length,
  };
}
