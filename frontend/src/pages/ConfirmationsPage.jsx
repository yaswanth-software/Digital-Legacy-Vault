import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConfirmations } from '../services/legacyRuleService';

const CONFIRMATION_THEMES = {
  pending: { label: 'Pending Response', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed Unavailability', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined: { label: 'Declined', badge: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Expired', badge: 'bg-slate-100 text-slate-500 border-slate-200' },
  revoked: { label: 'Revoked (Owner Active)', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function ConfirmationsPage() {
  const navigate = useNavigate();
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchConfirmations() {
    try {
      setLoading(true);
      setError(null);
      const res = await getConfirmations();
      if (res.success) {
        setConfirmations(res.data.confirmations);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve confirmation requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfirmations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Confirmation Requests</h1>
        <p className="mt-1 text-slate-500 text-sm">Respond to unavailability requests for vaults where you are a designated trusted person.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4 mb-6 font-semibold">
          {error}
        </div>
      )}

      {confirmations.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-slate-800">No Confirmation Requests</h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            You do not have any pending or past unavailability confirmation requests sent to you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {confirmations.map(conf => {
            const theme = CONFIRMATION_THEMES[conf.status] || { label: conf.status, badge: 'bg-slate-100' };
            const requestedDate = new Date(conf.requestedAt?._seconds ? conf.requestedAt._seconds * 1000 : conf.requestedAt);

            return (
              <div
                key={conf.id}
                onClick={() => navigate(`/confirmations/${conf.id}?vaultId=${conf.vaultId}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-semibold text-xs text-slate-700"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${theme.badge}`}>
                      {theme.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Requested {requestedDate.toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Legacy Unavailability Confirmation Request
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Vault ID: {conf.vaultId} | Rule ID: {conf.ruleId}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-650 hover:underline font-bold">
                    View Request
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
