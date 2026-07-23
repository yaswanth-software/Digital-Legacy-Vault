import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRules, activateRule, pauseRule, deleteRule } from '../services/legacyRuleService';

const RULE_STATUS_THEMES = {
  draft: { label: 'Draft', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  active: { label: 'Active monitoring', badge: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
  paused: { label: 'Paused', badge: 'bg-slate-100 text-slate-700 border-slate-350' },
  triggered: { label: 'Triggered', badge: 'bg-amber-50 text-amber-700 border-amber-250' },
  verification_pending: { label: 'Verification Pending', badge: 'bg-orange-50 text-orange-700 border-orange-255' },
  eligible: { label: 'Ready for Review', badge: 'bg-indigo-50 text-indigo-700 border-indigo-250' },
  conflict: { label: 'Overlap Conflict', badge: 'bg-red-50 text-red-750 border-red-250' }
};

export default function LegacyRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);

  async function fetchRules() {
    try {
      setLoading(true);
      setError(null);
      const res = await getRules();
      if (res.success) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve legacy rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivate = async (id, name, e) => {
    e.stopPropagation();
    try {
      const res = await activateRule(id);
      if (res.success) {
        triggerToast(`Rule "${name}" is now active!`);
        fetchRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to activate rule.');
    }
  };

  const handlePause = async (id, name, e) => {
    e.stopPropagation();
    try {
      const res = await pauseRule(id);
      if (res.success) {
        triggerToast(`Rule "${name}" has been paused.`);
        fetchRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pause rule.');
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete rule "${name}"?`)) return;
    try {
      const res = await deleteRule(id);
      if (res.success) {
        triggerToast(`Rule deleted successfully.`);
        fetchRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete rule.');
    }
  };

  // Perform Client-side Conflict Detection (Overlapping active assets checks)
  const activeRules = rules.filter(r => ['active', 'triggered', 'verification_pending', 'eligible', 'conflict'].includes(r.status));
  const assetIdCounts = {};
  activeRules.forEach(r => {
    r.assetIds.forEach(aid => {
      assetIdCounts[aid] = (assetIdCounts[aid] || 0) + 1;
    });
  });
  const conflictingAssetIds = Object.keys(assetIdCounts).filter(aid => assetIdCounts[aid] > 1);
  const hasConflict = conflictingAssetIds.length > 0;

  // Filter rules list
  const filteredRules = rules.filter(r => {
    // If client-side conflict detected and status is active/triggered, let's flag conflict
    const ruleHasConflict = r.assetIds.some(aid => conflictingAssetIds.includes(aid));
    const displayStatus = (ruleHasConflict && ['active', 'triggered', 'verification_pending', 'eligible'].includes(r.status)) ? 'conflict' : r.status;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'conflict') return ruleHasConflict;
    return displayStatus === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Legacy Rules</h1>
          <p className="mt-1 text-slate-500 text-sm md:text-base">Define when and under what conditions specific assets may become eligible for release.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/legacy-rules/eligible"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 border border-indigo-150 text-indigo-755 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-all"
          >
            📋 Ready for Review (Eligible)
          </Link>
          <Link
            to="/legacy-rules/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Create Legacy Rule
          </Link>
        </div>
      </div>

      {/* Conflict Warnings Notice */}
      {hasConflict && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 text-red-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs leading-relaxed font-semibold">
            <h4 className="font-extrabold text-red-900 text-sm mb-0.5">⚠️ Overlapping Rule Conflicts Detected</h4>
            Multiple active legacy rules target overlapping assets. For safety, access release calculations are blocked for these assets until rules are edited or paused to remove overlapping conflicts.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-750 text-xs rounded-xl p-4 mb-8 font-semibold">
          {error}
        </div>
      )}

      {/* Filters Tabs */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto pb-px mb-8 font-semibold text-xs text-slate-500">
        {[
          { id: 'all', label: 'All Rules' },
          { id: 'active', label: '🛡️ Active' },
          { id: 'draft', label: '📄 Draft' },
          { id: 'triggered', label: '⏳ Overdue/Triggered' },
          { id: 'verification_pending', label: '⚖️ Verifications' },
          { id: 'eligible', label: '✓ Eligible' },
          { id: 'conflict', label: '⚠️ Conflicts' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-3 border-b-2 font-bold transition-colors shrink-0 ${
              activeFilter === tab.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 h-48 animate-pulse"></div>
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <h3 className="text-base font-bold text-slate-800">No Legacy Rules Found</h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            You don't have any legacy rules matching this filter category. Create a legacy rule to set up check-in conditions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRules.map((rule) => {
            const ruleHasConflict = rule.assetIds.some(aid => conflictingAssetIds.includes(aid));
            const displayStatus = (ruleHasConflict && ['active', 'triggered', 'verification_pending', 'eligible'].includes(rule.status)) ? 'conflict' : rule.status;
            
            const theme = RULE_STATUS_THEMES[displayStatus] || { label: rule.status, badge: 'bg-slate-100' };

            return (
              <div
                key={rule.id}
                onClick={() => navigate(`/legacy-rules/${rule.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${theme.badge}`}>
                      {theme.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 capitalize">
                      Priority: {rule.priority}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 truncate" title={rule.name}>
                    {rule.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {rule.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Trigger</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {rule.triggerType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Assets</span>
                      <span className="font-bold text-indigo-650">{rule.assetIds.length} Selected</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Trusted People</span>
                      <span className="font-semibold text-slate-700">{rule.trustedPersonIds.length} designated</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Inline Action Controls */}
                  {displayStatus === 'draft' || displayStatus === 'paused' ? (
                    <button
                      onClick={(e) => handleActivate(rule.id, rule.name, e)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-100 transition-colors"
                    >
                      Activate Rule
                    </button>
                  ) : displayStatus === 'active' ? (
                    <button
                      onClick={(e) => handlePause(rule.id, rule.name, e)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors"
                    >
                      Pause Rule
                    </button>
                  ) : null}

                  <Link
                    to={`/legacy-rules/${rule.id}/edit`}
                    className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors"
                    title="Edit Rule"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>

                  <button
                    onClick={(e) => handleDelete(rule.id, rule.name, e)}
                    className="p-1.5 text-slate-400 hover:text-red-550 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors"
                    title="Delete Rule"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
