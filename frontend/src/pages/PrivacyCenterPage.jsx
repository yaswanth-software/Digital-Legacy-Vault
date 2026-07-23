import { useState } from 'react';
import { exportUserData, deleteAccount } from '../services/securityService';

export default function PrivacyCenterPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await exportUserData();
      if (res.success && res.data?.export) {
        const jsonStr = JSON.stringify(res.data.export, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legacyos-vault-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Vault metadata package exported successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteInput !== 'DELETE MY ACCOUNT') {
      alert('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }
    if (!window.confirm('Are you absolutely sure? This operation is permanent.')) return;

    try {
      setDeleting(true);
      const res = await deleteAccount(deleteInput);
      if (res.success) {
        alert('Account deletion initiated. You will be logged out.');
        window.location.href = '/';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process account deletion.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <span>🔒</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <span className="inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 mb-2">
          🔒 Privacy & Data Sovereignty
        </span>
        <h1 className="text-3xl font-extrabold text-slate-955 tracking-tight">Privacy Center</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Learn how LegacyOS protects your digital legacy, minimizes data collection, and guarantees data exportability.
        </p>
      </div>

      {/* Privacy Disclosures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>🛡️</span> Data Minimization
          </span>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            LegacyOS only stores details strictly required for digital vault organization and recipient verification. Unnecessary personal identity data is never collected.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>🔐 Structured Encryption</span>
          </span>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Sensitive structured text notes are protected with AES-256-GCM application-level encryption. Searchable metadata remains unencrypted for fast filtering.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>⚡ Zero Trust Authorization</span>
          </span>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Every file download link and asset request is verified server-side against verified Firebase ID tokens and active release permissions.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
          <span className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>⏱ Temporary Access Grants</span>
          </span>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Controlled release access tokens automatically expire after 72 hours and can be revoked by the vault owner at any time.
          </p>
        </div>
      </div>

      {/* Export Data Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Export My Data</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-md">
            Download a complete, sanitized JSON export of your vault metadata, assets, trusted contacts, legacy rules, and audit history.
          </p>
        </div>

        <button
          disabled={exporting}
          onClick={handleExportData}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shrink-0"
        >
          {exporting ? 'Generating Export...' : '📥 Export Vault JSON'}
        </button>
      </div>

      {/* Account Deletion Panel */}
      <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-red-900">Account Deletion</h3>
          <p className="text-xs text-red-700 font-medium mt-1 leading-relaxed">
            Deleting your account will initiate data cleanup according to our retention policy. This action requires explicit reauthentication.
          </p>
        </div>

        <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-md">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-red-800 mb-1">
              Type "DELETE MY ACCOUNT" to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full rounded-xl border border-red-200 px-3.5 py-2 text-xs text-slate-800 bg-white font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={deleting || deleteInput !== 'DELETE MY ACCOUNT'}
            className="px-4 py-2 bg-red-650 hover:bg-red-750 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            {deleting ? 'Processing...' : '⚠️ Request Account Deletion'}
          </button>
        </form>
      </div>
    </div>
  );
}
