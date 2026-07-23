import { useEffect, useState } from 'react';
import { getActivityLogs } from '../services/activityService';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Activity' },
  { id: 'vault', label: 'Vault & Assets' },
  { id: 'trusted_people', label: 'Trusted People' },
  { id: 'rules', label: 'Legacy Rules' },
  { id: 'continuity', label: 'Continuity' },
  { id: 'emergency', label: 'Emergency Access' },
  { id: 'releases', label: 'Releases' },
  { id: 'security', label: 'Security Alerts' },
];

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  async function loadActivity() {
    try {
      setLoading(true);
      const res = await getActivityLogs({ category, search });
      if (res.success) setLogs(res.data.activity);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadActivity();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <span className="inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 mb-2">
          📜 System Activity Log
        </span>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Activity Center</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Chronological audit trail of vault actions, rule evaluations, releases, and security events.
        </p>
      </div>

      {/* Category Tabs & Search Bar */}
      <Card padding="p-4" className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity events..."
            className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                category === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Activity Timeline List */}
      {loading ? (
        <SkeletonLoader count={4} height="h-20" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No activity events found"
          description="There are no activity logs matching your selected filter or search query."
        />
      ) : (
        <Card padding="p-6" className="space-y-6">
          <div className="divide-y divide-slate-100 space-y-4">
            {logs.map((item) => {
              const dateObj = item.timestamp?._seconds ? new Date(item.timestamp._seconds * 1000) : new Date(item.timestamp || Date.now());
              return (
                <div key={item.id} className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {item.resourceType === 'security' ? '🛡️' : item.resourceType === 'asset' ? '📦' : '⚙️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">
                          {(item.action || 'system_event').replace(/_/g, ' ')}
                        </span>
                        {item.severity && <StatusBadge status={item.severity} />}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Resource: <span className="font-mono text-slate-700">{item.resourceType} ({item.resourceId})</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {dateObj.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
