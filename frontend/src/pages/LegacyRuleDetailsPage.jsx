import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getRuleById,
  activateRule,
  pauseRule,
  deleteRule,
  simulateRule,
  getRuleEvaluations,
  executeRuleRelease
} from '../services/legacyRuleService';
import { getAssets } from '../services/vaultService';
import { getTrustedPeople } from '../services/trustedPeopleService';

const STATUS_THEMES = {
  draft: { label: 'Draft', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  active: { label: 'Active', badge: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
  paused: { label: 'Paused', badge: 'bg-slate-100 text-slate-700 border-slate-350' },
  triggered: { label: 'Triggered', badge: 'bg-amber-50 text-amber-700 border-amber-250' },
  verification_pending: { label: 'Verification Pending', badge: 'bg-orange-50 text-orange-700 border-orange-255' },
  eligible: { label: 'Eligible for Review', badge: 'bg-indigo-50 text-indigo-700 border-indigo-250' },
  released: { label: 'Release Active (Issued)', badge: 'bg-emerald-150 text-emerald-800 border-emerald-300' },
  conflict: { label: 'Conflict Blocked', badge: 'bg-red-50 text-red-750 border-red-250' }
};

const TIMELINE_STEPS = [
  { label: 'Legacy Rule', key: 'draft' },
  { label: 'Rule Triggered', key: 'triggered' },
  { label: 'Verification Starts', key: 'verification_pending' },
  { label: 'Trusted Person & Owner Check', key: 'verification_check' },
  { label: 'Security Review', key: 'security_review' },
  { label: 'Release Eligible', key: 'eligible' },
  { label: 'Controlled Release Token', key: 'token_issued' },
  { label: 'Limited-Time Access', key: 'limited_access' },
  { label: 'ACCESS Granted', key: 'released' }
];

export default function LegacyRuleDetailsPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();

  const [rule, setRule] = useState(null);
  const [assets, setAssets] = useState([]);
  const [trustedPeople, setTrustedPeople] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Simulation State
  const [simSettings, setSimSettings] = useState({
    status: 'active',
    confirmationResponse: 'pending'
  });
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [ruleRes, assetsRes, tpRes, evalRes] = await Promise.all([
        getRuleById(ruleId),
        getAssets({ status: 'all' }),
        getTrustedPeople(),
        getRuleEvaluations(ruleId)
      ]);

      if (ruleRes.success) setRule(ruleRes.data.rule);
      if (assetsRes.success) setAssets(assetsRes.data.assets);
      if (tpRes.success) setTrustedPeople(tpRes.data.trustedPeople);
      if (evalRes.success) setEvaluations(evalRes.data.evaluations);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load rule details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ruleId]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivate = async () => {
    try {
      const res = await activateRule(ruleId);
      if (res.success) {
        triggerToast('Rule activated successfully.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to activate rule.');
    }
  };

  const handlePause = async () => {
    try {
      const res = await pauseRule(ruleId);
      if (res.success) {
        triggerToast('Rule monitoring paused.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pause rule.');
    }
  };

  const handleExecuteRelease = async () => {
    if (!window.confirm('Execute Controlled Release? This will issue temporary access tokens for designated recipients.')) return;
    try {
      const res = await executeRuleRelease(ruleId);
      if (res.success) {
        triggerToast('Controlled release executed! Recipient access tokens created.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute release.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.name}"?`)) return;
    try {
      const res = await deleteRule(ruleId);
      if (res.success) {
        navigate('/legacy-rules');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await simulateRule(ruleId, simSettings);
      if (res.success) {
        setSimResult(res.data.simulation);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to run simulation.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-5 text-center max-w-lg mx-auto">
        <h4 className="font-bold text-sm">Failed to load rule</h4>
        <p className="text-xs mt-1">{error || 'Rule details not found.'}</p>
        <Link to="/legacy-rules" className="mt-4 inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          Back to list
        </Link>
      </div>
    );
  }

  const theme = STATUS_THEMES[rule.status] || { label: rule.status, badge: 'bg-slate-100' };

  // Calculate timeline index according to current status
  const getTimelineIndex = (status) => {
    switch (status) {
      case 'draft': return 0;
      case 'triggered': return 1;
      case 'verification_pending': return 2;
      case 'verification_check': return 3;
      case 'security_review': return 4;
      case 'eligible': return 5;
      case 'released': return 8;
      case 'active': return 0;
      default: return 0;
    }
  };
  const activeTimelineIdx = getTimelineIndex(rule.status);

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

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/legacy-rules" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Legacy Rules
        </Link>
      </div>

      {/* Top Details Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <div>
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border ${theme.badge}`}>
            {theme.label}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-955 tracking-tight mt-3">{rule.name}</h1>
          <p className="mt-1 text-slate-500 text-xs md:text-sm font-semibold">{rule.description || 'No description provided.'}</p>
        </div>

        {/* Actions panel */}
        <div className="flex flex-wrap gap-2">
          {rule.status === 'eligible' || rule.status === 'triggered' || rule.status === 'verification_pending' ? (
            <button
              onClick={handleExecuteRelease}
              className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              🚀 Execute Controlled Release
            </button>
          ) : null}

          {rule.status === 'released' && (
            <Link
              to="/releases"
              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              🔑 Manage Active Release
            </Link>
          )}

          {rule.status === 'draft' || rule.status === 'paused' ? (
            <button
              onClick={handleActivate}
              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Activate Rule
            </button>
          ) : rule.status === 'active' ? (
            <button
              onClick={handlePause}
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-600 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Pause Rule
            </button>
          ) : null}

          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-100 transition-colors"
          >
            Delete Rule
          </button>
        </div>
      </div>


      {/* Visual Timeline progress bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Rule Progress Timeline</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= activeTimelineIdx;
            const isCurrent = idx === activeTimelineIdx;

            return (
              <div key={step.label} className="flex-1 flex flex-col items-center text-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border transition-colors ${
                  isCurrent
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm shadow-indigo-50'
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  {isCompleted && !isCurrent ? '✓' : idx + 1}
                </div>
                <span className={`block mt-2 font-bold text-[10px] uppercase tracking-wider ${
                  isCurrent ? 'text-indigo-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
                {step.key === 'released' && rule.status === 'released' && (
                  <span className="block text-[8px] text-emerald-600 font-extrabold uppercase mt-0.5">
                    Release Token Active
                  </span>
                )}

              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Info Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Config Details */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Configuration Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-semibold text-slate-700">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Priority Level</span>
                <span className="capitalize">{rule.priority}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Trigger Mode</span>
                <span className="capitalize">{rule.triggerType.replace(/_/g, ' ')}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Selected Assets ({rule.assetIds.length})</span>
                <div className="divide-y divide-slate-50">
                  {rule.assetIds.map(aid => {
                    const a = assets.find(x => x.id === aid);
                    return (
                      <div key={aid} className="py-2 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{a?.name || `Asset Ref: ${aid}`}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{a?.category.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Designated Recipients ({rule.trustedPersonIds.length})</span>
                <div className="divide-y divide-slate-50">
                  {rule.trustedPersonIds.map(tpid => {
                    const tp = trustedPeople.find(x => x.id === tpid);
                    return (
                      <div key={tpid} className="py-2 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{tp?.fullName || `Recipient Ref: ${tpid}`}</span>
                        <span className="text-[10px] text-slate-400">{tp?.email}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Evaluations History Logs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 mb-4">Evaluation Audit Logs</h3>
            {evaluations.length === 0 ? (
              <p className="text-xs text-slate-450 italic py-6 text-center">No evaluations recorded yet. Run simulation or check-in to trigger evaluations.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {evaluations.map(ev => (
                  <div key={ev.id} className="border-l-2 border-slate-200 pl-4 py-1 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-700">{ev.result}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ev.evaluatedAt?._seconds ? ev.evaluatedAt._seconds * 1000 : ev.evaluatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">{ev.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Simulation Sandbox Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 mb-4">Dry-Run Simulation</h3>
            <p className="text-xs text-slate-550 leading-relaxed font-semibold mb-4">
              Simulate rule evaluations under customized check-in conditions. This dry-run **does not change database states** or send alerts.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-2">Check-in State</label>
                <select
                  value={simSettings.status}
                  onChange={(e) => setSimSettings(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700"
                >
                  <option value="active">Active (Checked in yesterday)</option>
                  <option value="reminder_sent">Overdue (Warning reminder running)</option>
                  <option value="missed">Missed (Grace period ended)</option>
                </select>
              </div>

              {simSettings.status === 'missed' && rule.conditions.trustedConfirmationRequired && (
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-2">Recipient Response</label>
                  <select
                    value={simSettings.confirmationResponse}
                    onChange={(e) => setSimSettings(prev => ({ ...prev, confirmationResponse: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-700"
                  >
                    <option value="pending">Awaiting confirmation (Pending)</option>
                    <option value="confirmed">Unavailability Confirmed</option>
                    <option value="declined">Request Declined</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={simulating}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                {simulating ? 'Evaluating...' : '⚡ Run Simulation'}
              </button>
            </form>

            {/* Simulation outcome dashboard */}
            {simResult && (
              <div className="mt-6 border-t border-slate-100 pt-5 animate-fade-in space-y-3.5">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Expected Status Output</span>
                  <span className="inline-flex text-[10px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-750 px-2.5 py-0.5 rounded-full uppercase">
                    {simResult.result}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Evaluation Reason</span>
                  <p className="text-xs font-semibold text-slate-650 leading-relaxed">
                    {simResult.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
