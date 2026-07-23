import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getConfirmationById, confirmUnavailability, declineConfirmation } from '../services/legacyRuleService';

const CONFIRMATION_STATUSES = {
  pending: { label: 'Awaiting Response', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed Unavailability', badge: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
  declined: { label: 'Declined', badge: 'bg-red-50 text-red-700 border-red-250' },
  expired: { label: 'Expired', badge: 'bg-slate-100 text-slate-500 border-slate-200' },
  revoked: { label: 'Revoked (Owner Active)', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function ConfirmationDetailsPage() {
  const { confirmationId } = useParams();
  const [searchParams] = useSearchParams();
  const vaultId = searchParams.get('vaultId');
  const navigate = useNavigate();

  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  async function loadConfirmation() {
    if (!vaultId) {
      setError('vaultId query parameter is required.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getConfirmationById(confirmationId, vaultId);
      if (res.success) {
        setConfirmation(res.data.confirmation);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve confirmation request details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfirmation();
  }, [confirmationId, vaultId]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirm = async () => {
    if (!window.confirm('WARNING: Confirming unavailability is a safety-critical action. Are you sure you wish to submit?')) return;
    setSubmitting(true);
    try {
      const res = await confirmUnavailability(confirmationId, vaultId);
      if (res.success) {
        triggerToast('Unavailability confirmed successfully.');
        loadConfirmation();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this confirmation request? This will reset the legacy rule back to active status.')) return;
    setSubmitting(true);
    try {
      const res = await declineConfirmation(confirmationId, vaultId);
      if (res.success) {
        triggerToast('Confirmation request declined.');
        loadConfirmation();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-5 text-center max-w-lg mx-auto">
        <h4 className="font-bold text-sm">Failed to load request</h4>
        <p className="text-xs mt-1">{error || 'Confirmation request details not found.'}</p>
        <Link to="/confirmations" className="mt-4 inline-flex items-center text-xs font-semibold text-indigo-650 hover:underline">
          Back to requests list
        </Link>
      </div>
    );
  }

  const theme = CONFIRMATION_STATUSES[confirmation.status] || { label: confirmation.status, badge: 'bg-slate-100' };

  return (
    <div className="max-w-2xl mx-auto">
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
        <Link to="/confirmations" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-650 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Request List
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Unavailability Request</h1>
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${theme.badge}`}>
            {theme.label}
          </span>
        </div>

        <div className="space-y-6 text-xs text-slate-700 font-semibold leading-relaxed">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Vault Owner Reference</span>
              <span className="text-sm font-extrabold text-slate-800">Owner ID: {confirmation.ownerId}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Requested On</span>
                <span className="text-slate-800">
                  {new Date(confirmation.requestedAt?._seconds ? confirmation.requestedAt._seconds * 1000 : confirmation.requestedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Expires On</span>
                <span className="text-slate-800">
                  {new Date(confirmation.expiresAt?._seconds ? confirmation.expiresAt._seconds * 1000 : confirmation.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-indigo-150 bg-indigo-50/20 text-indigo-900 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-sm flex items-center gap-1">
              🛡️ Safety Guidance
            </h4>
            <p className="text-[11px] font-medium leading-relaxed">
              As a designated trusted person, you are checking in on the vault owner's status.
            </p>
            <ul className="list-disc pl-4 text-[10.5px] font-semibold space-y-1">
              <li>**Confirm Unavailability** if you are certain the owner is unavailable and needs the legacy release rules to process.</li>
              <li>**Decline** if you have verified the owner is active or the request is no longer needed.</li>
            </ul>
          </div>

          {/* Action Responses Buttons */}
          {confirmation.status === 'pending' ? (
            <div className="flex gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-red-50 hover:bg-red-100 text-red-650 font-bold border border-red-150 rounded-xl transition-all"
              >
                Decline Request
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100"
              >
                Confirm Unavailability
              </button>
            </div>
          ) : (
            <div className="pt-4 text-center text-slate-450 italic text-[11px] font-semibold">
              This request was resolved on {new Date(confirmation.updatedAt?._seconds ? confirmation.updatedAt._seconds * 1000 : confirmation.updatedAt).toLocaleString()}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
