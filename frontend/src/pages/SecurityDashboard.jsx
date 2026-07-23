import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSecurityOverview, getSecurityEvents, acknowledgeSecurityEvent } from '../services/securityService';

const SEVERITY_BADGES = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
};

export default function SecurityDashboard() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function loadSecurityData() {
    try {
      setLoading(true);
      setError(null);
      const [overviewRes, eventsRes] = await Promise.all([
        getSecurityOverview(),
        getSecurityEvents()
      ]);

      if (overviewRes.success) setOverview(overviewRes.data.overview);
      if (eventsRes.success) setEvents(eventsRes.data.events);
    } catch (err) {
      console.error(err);
      setError('Failed to load security overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityData();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAcknowledge = async (eventId) => {
    try {
      setActionLoading(true);
      const res = await acknowledgeSecurityEvent(eventId);
      if (res.success) {
        showToast('Security alert acknowledged.');
        loadSecurityData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge alert.');
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <span>🛡️</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 mb-2">
            🛡️ Protected Platform
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Security Dashboard</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Monitor real-time access security, active token releases, verification audits, and security alerts.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/settings/security"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            ⚙️ Security Settings
          </Link>
          <Link
            to="/privacy"
            className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            🔒 Privacy Center
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4 font-semibold">
          {error}
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vault Security</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 capitalize">{overview?.vaultStatus || 'Protected'}</span>
            <span className="text-xs text-slate-400">🔒</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Zero Trust server-side authorization</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage Protection</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 capitalize">{overview?.storageStatus || 'Private'}</span>
            <span className="text-xs text-slate-400">📦</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Short-lived signed access links (5 mins)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Token Releases</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{overview?.activeReleasesCount || 0}</span>
            <span className="text-xs text-slate-400">🔑</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Temporary limited-time access</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unacknowledged Alerts</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${overview?.unacknowledgedAlertsCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {overview?.unacknowledgedAlertsCount || 0}
            </span>
            <span className="text-xs text-slate-400">⚠️</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Security event monitoring</p>
        </div>
      </div>

      {/* Security Principles & Disclosures Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">Security & Privacy Architecture</h3>
            <p className="text-xs text-slate-400 font-medium">Designed with security and privacy as core engineering principles.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs font-semibold">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="text-indigo-400 font-bold">🔐 AES-256-GCM Encryption</span>
            <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
              Sensitive fields are encrypted using AES-256-GCM with unique 12-byte random IVs and 128-bit authentication tags.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="text-emerald-400 font-bold">⚡ Zero Trust Access Model</span>
            <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
              Server-side backend token verification evaluates vault ownership and permissions on every request.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="text-amber-400 font-bold">⏱ Limited-Time Access</span>
            <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
              Release tokens automatically expire after 72 hours and can be revoked instantly by the vault owner.
            </p>
          </div>
        </div>
      </div>

      {/* Security Event Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Security Events & Alerts Log</h3>
            <p className="text-xs text-slate-500 font-medium">Recent security event logs and suspicious access attempts.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{events.length} Records</span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No security events or alerts logged. System operating normally.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${SEVERITY_BADGES[ev.severity]}`}>
                      {ev.severity}
                    </span>
                    <span className="font-bold text-slate-800 capitalize">{ev.eventType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ev.createdAt || ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-semibold">
                    {JSON.stringify(ev.details || {})}
                  </p>
                </div>

                <div className="shrink-0">
                  {ev.acknowledged ? (
                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      ✓ Acknowledged
                    </span>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAcknowledge(ev.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-[11px]"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
