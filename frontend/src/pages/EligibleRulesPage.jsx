import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRules, pauseRule, deleteRule, updateRule, executeRuleRelease } from '../services/legacyRuleService';
import { checkIn } from '../services/continuityService';

export default function EligibleRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function fetchEligibleRules() {
    try {
      setLoading(true);
      setError(null);
      const res = await getRules();
      if (res.success) {
        // filter eligible rules
        const eligibleList = res.data.rules.filter(r => r.status === 'eligible');
        setRules(eligibleList);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve eligible rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEligibleRules();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleExecuteRelease = async (ruleId) => {
    if (!window.confirm('Execute Controlled Release for this rule? This will issue temporary access tokens to designated recipients.')) return;
    try {
      setActionLoading(true);
      const res = await executeRuleRelease(ruleId);
      if (res.success) {
        triggerToast('Controlled release executed! Recipient tokens created.');
        fetchEligibleRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute release.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to cancel the eligibility of this rule? This will set it back to Active monitoring status.')) return;
    try {
      setActionLoading(true);
      // Safety-Fallback reset: update rule status back to active
      const res = await updateRule(ruleId, { status: 'active' });
      if (res.success) {
        triggerToast('Rule reset to active monitoring state.');
        fetchEligibleRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel eligibility.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform "I'm Active" check-in override directly
  const handleCheckInReset = async () => {
    try {
      setActionLoading(true);
      const res = await checkIn('eligible_page');
      if (res.success) {
        triggerToast('Check-in override registered. All rules reset back to active.');
        fetchEligibleRules();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/legacy-rules" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Legacy Rules
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-955 tracking-tight">Ready for Review</h1>
          <p className="mt-1 text-slate-500 text-sm">Rules that have completed verification cycles and are eligible for final review.</p>
        </div>
        
        {rules.length > 0 && (
          <button
            onClick={handleCheckInReset}
            disabled={actionLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            ⚡ Cancel All (I'm Active)
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4 mb-6 font-semibold">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <h3 className="text-sm font-bold text-slate-700">No Eligible Rules</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
            You do not have any legacy rules that have reached eligible "Ready for Review" status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-semibold text-xs text-slate-700"
            >
              <div>
                <span className="inline-flex text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-indigo-50 border-indigo-250 text-indigo-700 mb-2">
                  Ready for Review
                </span>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {rule.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Assets: {rule.assetIds.length} | Recipients: {rule.trustedPersonIds.length} | Priority: {rule.priority}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleExecuteRelease(rule.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                >
                  🚀 Release
                </button>
                <button
                  onClick={() => handleCancelRule(rule.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-white text-slate-650 hover:bg-slate-50 border border-slate-200 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Link
                  to={`/legacy-rules/${rule.id}`}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-center"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

