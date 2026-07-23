import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatus, checkIn, getHistory, pauseContinuity, resumeContinuity } from '../services/continuityService';

const STATUS_THEMES = {
  active: { label: 'Active', badge: 'bg-emerald-50 text-emerald-700 border-emerald-255', desc: 'Your legacy plans are secure. Keep checking in periodically.' },
  due: { label: 'Check-in Due', badge: 'bg-amber-50 text-amber-700 border-amber-255', desc: 'Your scheduled check-in is due. Please check in soon.' },
  reminder_sent: { label: 'Overdue Reminder', badge: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Overdue reminder sent. Confirm your activity to avoid trigger states.' },
  grace_period: { label: 'Grace Period', badge: 'bg-orange-50 text-orange-700 border-orange-255', desc: 'Overdue check-in grace period is running. Confirm activity.' },
  missed: { label: 'Check-in Missed', badge: 'bg-red-50 text-red-700 border-red-255', desc: 'Check-in missed. Verification procedures and rules evaluating.' },
  paused: { label: 'Monitoring Paused', badge: 'bg-slate-100 text-slate-700 border-slate-350', desc: 'Check-in cycles are paused. Legacy rules will not evaluate.' },
};

export default function ContinuityDashboard() {
  const [statusInfo, setStatusInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([getStatus(), getHistory()]);
      if (statusRes.success) setStatusInfo(statusRes.data);
      if (historyRes.success) setHistory(historyRes.data.history);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve continuity timelines.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await checkIn('dashboard');
      if (res.success) {
        triggerToast('Check-in successful. Your Legacy Vault is marked as active!');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!window.confirm('Are you sure you want to pause check-in monitoring? This will prevent rules from evaluating.')) return;
    try {
      setActionLoading(true);
      const res = await pauseContinuity();
      if (res.success) {
        triggerToast('Check-in monitoring paused.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pause.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      const res = await resumeContinuity();
      if (res.success) {
        triggerToast('Check-in monitoring resumed.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resume.');
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

  const theme = STATUS_THEMES[statusInfo?.status] || { label: statusInfo?.status, badge: 'bg-slate-100 text-slate-700', desc: '' };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    return new Date(dateVal?._seconds ? dateVal._seconds * 1000 : dateVal).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Determine timeline progress step index
  const statusSteps = ['active', 'due', 'reminder_sent', 'grace_period', 'missed'];
  const currentStepIndex = statusSteps.indexOf(statusInfo?.status);

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
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Legacy Continuity</h1>
          <p className="mt-1 text-slate-500 text-sm md:text-base">Stay connected to the legacy you've planned.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/continuity/settings"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            Manage Check-in Settings
          </Link>
          {statusInfo?.status === 'paused' ? (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Resume Monitoring
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-650 font-bold text-xs rounded-xl transition-colors"
            >
              Pause Monitoring
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-705 rounded-xl p-4 mb-8 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Status Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Cycle Status</span>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border ${theme.badge}`}>
                {theme.label}
              </span>
            </div>
            <p className="text-sm text-slate-550 leading-relaxed font-medium mb-6">
              {theme.desc}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Last Checked In</span>
                <span className="font-bold text-slate-800">{formatDate(statusInfo?.lastCheckInAt)}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Next Check-in Due</span>
                <span className="font-bold text-slate-800">
                  {statusInfo?.status === 'paused' ? 'Paused' : formatDate(statusInfo?.nextCheckInDueAt)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 md:col-span-1">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Grace Period Days</span>
                <span className="font-bold text-slate-800">{statusInfo?.gracePeriodDays || 14} Days</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-sm">
              Vault check-ins verify that you are active. Completing a check-in resets warning timers and cancels pending confirmations.
            </p>
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || statusInfo?.status === 'paused'}
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50 flex-shrink-0"
            >
              {actionLoading ? 'Verifying...' : '⚡ I\'m Active'}
            </button>
          </div>
        </div>

        {/* Informative Side Panel */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-850 rounded-3xl p-6 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold mb-2 tracking-tight">Continuity Protocol</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              LegacyOS implements a safety-first confirmation lifecycle. Your files are not released based on a simple timeout. If a check-in is missed:
            </p>
            <ul className="mt-4 space-y-3.5 text-xs text-slate-300 font-semibold">
              <li className="flex items-start gap-2">
                <span className="text-amber-400">❶</span>
                <span>You will receive final warning reminders.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">❷</span>
                <span>Grace period buffers start automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">❸</span>
                <span>Trusted people confirmation requests are triggered only after grace period ends.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-semibold">
            🛡️ Your digital assets remain securely encrypted and private during verification phases.
          </div>
        </div>
      </div>

      {/* Visual Timeline Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
        <h3 className="text-base font-extrabold text-slate-900 mb-6">Safety Verification Timeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-semibold">
          {[
            { step: 'Active', key: 'active', desc: 'Vault marked active.' },
            { step: 'Check-in Due', key: 'due', desc: 'Frequency timeline reached.' },
            { step: 'Overdue Warning', key: 'reminder_sent', desc: 'Reminders dispatched.' },
            { step: 'Grace Period', key: 'grace_period', desc: 'Safety time buffer running.' },
            { step: 'Verification Phase', key: 'missed', desc: 'Trusted confirmation sent.' },
            { step: 'Ready for Review', key: 'eligible', desc: 'Verification satisfied.' },
          ].map((item, idx) => {
            const isMatch = statusInfo?.status === item.key || (item.key === 'eligible' && statusInfo?.status === 'release_eligible');
            
            return (
              <div
                key={item.step}
                className={`border rounded-2xl p-4 flex flex-col justify-between h-28 transition-all ${
                  isMatch
                    ? 'border-indigo-400 bg-indigo-50/20 shadow-sm shadow-indigo-50'
                    : 'border-slate-100 bg-slate-50/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Step {idx + 1}</span>
                    {isMatch && <span className="w-1.5 h-1.5 bg-indigo-650 rounded-full animate-ping"></span>}
                  </div>
                  <h4 className="font-extrabold text-slate-800 mt-2">{item.step}</h4>
                </div>
                <p className="text-[9px] text-slate-450 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900">Recent Check-in Logs</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-6 text-center text-slate-400 italic text-xs font-semibold">
            No check-in history records found yet.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs md:text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action Method</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold text-xs">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {new Date(log.checkedInAt?._seconds ? log.checkedInAt._seconds * 1000 : log.checkedInAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {log.method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                        Logged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
