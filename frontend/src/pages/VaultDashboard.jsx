import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAssets, archiveAsset } from '../services/vaultService';
import { getIncomingRequests } from '../services/emergencyAccessService';

const CATEGORIES = [
  { id: 'important_documents', label: 'Important Documents', icon: '📄', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'financial', label: 'Financial', icon: '💰', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'property', label: 'Property', icon: '🏠', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'digital_accounts', label: 'Digital Accounts', icon: '🔑', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'personal_memories', label: 'Personal Memories', icon: '📸', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'personal_messages', label: 'Personal Messages', icon: '✉️', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'final_instructions', label: 'Final Instructions', icon: '📝', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'other', label: 'Other', icon: '📁', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const ASSET_TYPES = {
  document: 'Document',
  account: 'Account/Credential',
  instruction: 'Instruction',
  message: 'Personal Message',
  memory: 'Memory/Photo',
  other: 'Other',
};

const PRIORITIES = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium: { label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'High', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', badge: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },
};

export default function VaultDashboard() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('recently_updated');
  const [statusFilter, setStatusFilter] = useState('active'); // active, archived, all

  const [notification, setNotification] = useState(null);

  async function fetchAssets() {
    try {
      setLoading(true);
      setError(null);
      // Fetch all user assets (including archived) to run local search/filtering/statistics
      const res = await getAssets({ status: 'all' });
      if (res.success) {
        setAssets(res.data.assets);
      } else {
        throw new Error(res.message || 'Failed to fetch assets.');
      }

      // Load incoming requests count
      const incRes = await getIncomingRequests();
      if (incRes.success) {
        const pendingReqs = incRes.data.requests.filter(r => r.status === 'pending' || r.status === 'verification_required');
        setIncomingCount(pendingReqs.length);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'We couldn\'t connect to your Legacy Vault. Please verify configuration and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleArchive = async (assetId) => {
    try {
      const res = await archiveAsset(assetId);
      if (res.success) {
        showNotification('Asset archived successfully.');
        // Update local list
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'archived' } : a));
      }
    } catch (err) {
      console.error('Failed to archive asset:', err);
      alert('Failed to archive asset. Please try again.');
    }
  };

  // Helper calculation of statistics (from all assets)
  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'active').length,
    archived: assets.filter(a => a.status === 'archived').length,
    critical: assets.filter(a => a.status === 'active' && a.priority === 'critical').length,
    totalFiles: assets.reduce((sum, a) => sum + (a.fileCount || 0), 0),
    assetsWithFiles: assets.filter(a => a.status === 'active' && (a.fileCount || 0) > 0).length,
    assetsWithoutFiles: assets.filter(a => a.status === 'active' && (a.fileCount || 0) === 0).length,
  };

  // Calculate asset count per category
  const categoryCounts = assets.reduce((acc, curr) => {
    if (curr.status === 'active') {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
    }
    return acc;
  }, {});

  // Clear filters helper
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPriority('');
    setSelectedType('');
    setSortBy('recently_updated');
    setStatusFilter('active');
  };

  // Filter & Sort Logic
  const filteredAssets = assets
    .filter((asset) => {
      // Status Filter
      if (statusFilter === 'active' && asset.status !== 'active') return false;
      if (statusFilter === 'archived' && asset.status !== 'archived') return false;

      // Category Filter
      if (selectedCategory && asset.category !== selectedCategory) return false;

      // Priority Filter
      if (selectedPriority && asset.priority !== selectedPriority) return false;

      // Asset Type Filter
      if (selectedType && asset.assetType !== selectedType) return false;

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = asset.name?.toLowerCase().includes(query);
        const matchesDesc = asset.description?.toLowerCase().includes(query);
        const matchesNotes = asset.notes?.toLowerCase().includes(query);
        const matchesTags = asset.tags?.some(tag => tag.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesNotes || matchesTags;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recently_updated') {
        return new Date(b.updatedAt?._seconds ? b.updatedAt._seconds * 1000 : b.updatedAt) - 
               new Date(a.updatedAt?._seconds ? a.updatedAt._seconds * 1000 : a.updatedAt);
      }
      if (sortBy === 'recently_created') {
        return new Date(b.createdAt?._seconds ? b.createdAt._seconds * 1000 : b.createdAt) - 
               new Date(a.createdAt?._seconds ? a.createdAt._seconds * 1000 : a.createdAt);
      }
      if (sortBy === 'name_a_z') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_z_a') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'priority') {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">My Legacy Vault</h1>
          <p className="mt-1 text-slate-500 text-sm md:text-base">Organize what matters today, so it can be understood tomorrow.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/vault/archived"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
            </svg>
            Archived Assets ({stats.archived})
          </Link>
          <Link
            to="/vault/assets/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Digital Asset
          </Link>
        </div>
      </div>

      {incomingCount > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-950 rounded-3xl p-5 mb-8 flex items-center justify-between shadow-sm shadow-red-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h4 className="font-extrabold text-sm text-red-800">Pending Emergency Access Requests</h4>
              <p className="text-xs text-red-705 font-semibold mt-0.5">
                You have {incomingCount} incoming emergency access request(s) waiting for security review.
              </p>
            </div>
          </div>
          <Link
            to="/emergency-access"
            className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            Review Request(s)
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-bold text-red-800">Configuration Required</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
            {error.includes('backend/.env') && (
              <div className="mt-4 pt-3 border-t border-red-150 text-xs text-red-800">
                <p className="font-bold text-red-800 mb-1.5 uppercase tracking-wider text-[10px]">How to resolve this:</p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed font-medium">
                  <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-indigo-700 hover:text-indigo-900 font-bold">Firebase Console</a>.</li>
                  <li>Navigate to <strong>Project Settings</strong> &rarr; <strong>Service Accounts</strong> for project <code>digital-legacy-vault-61b0a</code>.</li>
                  <li>Click <strong>Generate new private key</strong> to download your service account JSON file.</li>
                  <li>Open <code>backend/.env</code> in your editor and copy the values for:
                    <ul className="list-disc pl-5 mt-1 font-mono text-[10px] bg-red-100/50 p-1.5 rounded border border-red-200">
                      <li><code>FIREBASE_CLIENT_EMAIL</code></li>
                      <li><code>FIREBASE_PRIVATE_KEY</code> (include the full key starting with <code>-----BEGIN PRIVATE KEY-----</code> and replace newlines with <code>\n</code>)</li>
                    </ul>
                  </li>
                  <li>Restart your backend server to load the new credentials.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="space-y-4 mb-8">
        {/* Row 1: Asset Counts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets', val: stats.total, color: 'border-slate-200 bg-white text-slate-800' },
            { label: 'Active Assets', val: stats.active, color: 'border-indigo-100 bg-indigo-50/30 text-indigo-800' },
            { label: 'Archived Assets', val: stats.archived, color: 'border-amber-100 bg-amber-50/20 text-amber-800', link: '/vault/archived' },
            { label: 'Critical Assets', val: stats.critical, color: 'border-red-100 bg-red-50/20 text-red-800' },
          ].map((c) => (
            <div
              key={c.label}
              className={`border rounded-2xl p-5 shadow-sm transition-all ${
                c.link ? 'cursor-pointer hover:shadow-md' : ''
              } ${c.color}`}
              onClick={() => c.link && navigate(c.link)}
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {loading ? (
                    <span className="inline-block w-8 h-8 bg-slate-200 animate-pulse rounded"></span>
                  ) : (
                    c.val
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: File Attachment Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Attached Files', val: stats.totalFiles, color: 'border-slate-200 bg-white text-slate-850', icon: '📎' },
            { label: 'Assets with Files', val: stats.assetsWithFiles, color: 'border-emerald-100 bg-emerald-50/20 text-emerald-800', icon: '✓' },
            { label: 'Assets without Files', val: stats.assetsWithoutFiles, color: 'border-slate-150 bg-slate-50/30 text-slate-600', icon: '⚡' },
          ].map((c) => (
            <div
              key={c.label}
              className={`border rounded-2xl p-4.5 shadow-sm flex items-center justify-between ${c.color}`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-xl md:text-2xl font-extrabold tracking-tight">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded"></span>
                    ) : (
                      c.val
                    )}
                  </span>
                </div>
              </div>
              <span className="text-2xl opacity-80">{c.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Summaries Grid */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Assets By Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isFilterActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isFilterActive ? '' : cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isFilterActive
                    ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300 scale-102 shadow-sm'
                    : count > 0
                    ? 'bg-white hover:border-slate-300 border-slate-200 shadow-sm'
                    : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                }`}
              >
                <span className="text-2xl mb-1.5">{cat.icon}</span>
                <span className="text-[11px] font-bold text-slate-700 leading-tight w-full truncate px-1">
                  {cat.label}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List Toolbar / Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="lg:col-span-4 relative">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search your legacy assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">All Types</option>
              {Object.entries(ASSET_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Sort selection */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="recently_created">Recently Created</option>
              <option value="name_a_z">Name A-Z</option>
              <option value="name_z_a">Name Z-A</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Filters Active Summary */}
        {(selectedCategory || selectedPriority || selectedType || searchQuery || statusFilter !== 'active') && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1 uppercase">Active Filters:</span>
              
              {statusFilter !== 'active' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  Status: {statusFilter}
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                  Category: {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </span>
              )}
              {selectedPriority && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md">
                  Priority: {PRIORITIES[selectedPriority]?.label}
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md">
                  Type: {ASSET_TYPES[selectedType]}
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                  Query: "{searchQuery}"
                </span>
              )}
            </div>
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active vs Archived Segment Control */}
      <div className="mb-6 border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setStatusFilter('active')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${
            statusFilter === 'active'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Assets ({stats.active})
        </button>
        <button
          onClick={() => setStatusFilter('archived')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${
            statusFilter === 'archived'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Archived Assets ({stats.archived})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${
            statusFilter === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Assets ({stats.total})
        </button>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-6 h-64 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="w-1/3 h-5 bg-slate-200 animate-pulse rounded"></div>
                  <div className="w-12 h-5 bg-slate-200 animate-pulse rounded"></div>
                </div>
                <div className="w-3/4 h-6 bg-slate-200 animate-pulse rounded mb-2"></div>
                <div className="w-full h-12 bg-slate-100 animate-pulse rounded mb-4"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="w-16 h-4 bg-slate-200 animate-pulse rounded"></div>
                <div className="w-20 h-8 bg-slate-200 animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          {assets.length === 0 ? (
            <>
              <h3 className="text-xl font-bold text-slate-800">Your legacy vault is empty.</h3>
              <p className="mt-2 text-slate-500 text-sm leading-relaxed">
                Start organizing the things that matter most. You can catalog credentials, notes, digital memories, policies, and final instructions securely.
              </p>
              <Link
                to="/vault/assets/new"
                className="inline-flex items-center justify-center mt-6 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md"
              >
                Add Your First Asset
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-800">No assets found.</h3>
              <p className="mt-2 text-slate-500 text-sm">No items matched your search query or filter selection criteria.</p>
              <button
                onClick={handleClearFilters}
                className="mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => {
            const catInfo = CATEGORIES.find(c => c.id === asset.category);
            const prioInfo = PRIORITIES[asset.priority] || { label: asset.priority, badge: 'bg-slate-100' };

            const updatedStr = new Date(asset.updatedAt?._seconds ? asset.updatedAt._seconds * 1000 : asset.updatedAt)
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={asset.id}
                className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative ${
                  asset.status === 'archived' ? 'border-amber-200 bg-amber-50/5' : 'border-slate-200'
                }`}
              >
                {/* Archived Banner */}
                {asset.status === 'archived' && (
                  <span className="absolute top-3 right-3 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Archived
                  </span>
                )}

                <div>
                  {/* Category and Type Row */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${catInfo?.bg || 'bg-slate-100 border-slate-200'}`}>
                      <span>{catInfo?.icon || '📁'}</span>
                      {catInfo?.label || asset.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      {ASSET_TYPES[asset.assetType] || asset.assetType}
                    </span>
                  </div>

                  {/* Asset Name */}
                  <h3 className="text-lg font-bold text-slate-800 leading-snug line-clamp-1 hover:text-indigo-600 transition-colors">
                    <Link to={`/vault/assets/${asset.id}`}>{asset.name}</Link>
                  </h3>

                  {/* Description */}
                  <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 h-8">
                    {asset.description || 'No description provided.'}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3.5 h-6 overflow-hidden">
                    {asset.tags && asset.tags.length > 0 ? (
                      asset.tags.map(t => (
                        <span key={t} className="text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">No tags</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  {/* File Upload Status Banner */}
                  <div className="mb-4 bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      File Attachment
                    </span>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Soon</span>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Priority and Date Info */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${prioInfo.badge}`}>
                        {prioInfo.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Updated {updatedStr}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/vault/assets/${asset.id}`}
                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-1.5 py-1"
                      >
                        View
                      </Link>
                      
                      {asset.status === 'archived' ? (
                        <Link
                          to="/vault/archived"
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 px-1.5 py-1"
                        >
                          Manage
                        </Link>
                      ) : (
                        <>
                          <Link
                            to={`/vault/assets/${asset.id}/edit`}
                            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-1.5 py-1"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleArchive(asset.id)}
                            className="text-xs font-semibold text-slate-400 hover:text-red-500 px-1.5 py-1 transition-colors"
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
