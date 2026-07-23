import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReleases, revokeRelease, triggerManualExpireCheck } from '../services/releaseService';

export default function ManageReleasesPage() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  async function loadReleases() {
    try {
      setLoading(true);
      setError(null);
      const res = await getReleases('owner');
      if (res.success) {
        setReleases(res.data.releases);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load releases.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReleases();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleRevoke = async (id) => {
    const reason = window.prompt('Please enter the reason for revoking this release:');
    if (!reason || reason.trim() === '') return;

    try {
      setActionLoading(true);
      const res = await revokeRelease(id, reason);
      if (res.success) {
        triggerToast('Release access has been revoked.');
        loadReleases();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke release.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCronTrigger = async () => {
    try {
      setActionLoading(true);
      const res = await triggerManualExpireCheck();
      if (res.success) {
        triggerToast(`Manual check run. Expired ${res.data.expiredCount} releases.`);
        loadReleases();
      }
    } catch (err) {
      alert('Failed to trigger manual checks.');
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 border border-slate-800 animate-slide-in">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">⚙️ Manage Releases</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Monitor active legacy releases, revoke access parameters, or audit active downloads.
          </p>
        </div>
        <div>
          <button
            disabled={actionLoading}
            onClick={handleCronTrigger}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors border border-slate-200"
          >
            ⏰ Trigger Expiration Scan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Releases Table/Card Grid */}
      {releases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 italic text-sm shadow-sm">
          You have not authorized or activated any releases yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {releases.map((rel) => (
            <div key={rel.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-450">ID: {rel.id.substring(0, 8)}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1 capitalize">Access: {rel.accessLevel.replace('_', ' ')}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                    rel.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'
                  }`}>
                    {rel.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Assets released:</span>
                    <span className="font-bold text-slate-700">{rel.assetIds.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Recipient ID:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[100px]">{rel.recipientId.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Activated:</span>
                    <span className="font-bold text-slate-750">
                      {new Date(rel.activatedAt?._seconds ? rel.activatedAt._seconds * 1000 : rel.activatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Expires:</span>
                    <span className="font-bold text-red-650">
                      {new Date(rel.expiresAt?._seconds ? rel.expiresAt._seconds * 1000 : rel.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {rel.status === 'revoked' && (
                  <p className="text-[10px] bg-red-50 text-red-750 border border-red-100 p-2 rounded-lg italic">
                    Revoked: "{rel.revokedReason}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2 w-full">
                <Link
                  to={`/releases/${rel.id}/activity`}
                  className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl border border-slate-200 transition-colors"
                >
                  📊 Logs
                </Link>
                {rel.status === 'active' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRevoke(rel.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
