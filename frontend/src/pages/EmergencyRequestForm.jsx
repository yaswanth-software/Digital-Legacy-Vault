import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAvailableAssets, createEmergencyRequest } from '../services/emergencyAccessService';

export default function EmergencyRequestForm() {
  const navigate = useNavigate();
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('normal');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function loadAvailableAssets() {
    try {
      setLoading(true);
      setError(null);
      const res = await getAvailableAssets();
      if (res.success) {
        setAvailableAssets(res.data.assets);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load eligible emergency access assets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailableAssets();
  }, []);

  const handleAssetToggle = (assetId) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAssetIds.length === 0) {
      setError('Please select at least one asset.');
      return;
    }
    if (reason.trim().length < 20 || reason.trim().length > 1000) {
      setError('The reason must be between 20 and 1000 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Find the vaultId from the first selected asset
      const selectedAsset = availableAssets.find(a => a.assetId === selectedAssetIds[0]);
      const vaultId = selectedAsset.vaultId;

      const res = await createEmergencyRequest({
        reason,
        priority,
        vaultId,
        requestedAssetIds: selectedAssetIds
      });

      if (res.success) {
        alert('Your emergency access request has been submitted. Access will only be granted after the required verification process is completed.');
        navigate('/emergency-access');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit emergency request.');
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/emergency-access" className="text-xs text-indigo-650 hover:underline font-semibold flex items-center gap-1.5 mb-2">
          &larr; Back to Emergency Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">🚨 Request Emergency Access</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Please select the legacy assets you require access to and provide a detailed reason.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {availableAssets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-450 italic text-sm">
          There are no eligible legacy assets configured for you under emergency access. 
          Please contact the vault owner to configure permissions.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Select Assets to Request Access</h3>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {availableAssets.map((asset) => (
                <label key={asset.assetId} className="flex items-start gap-3 py-3 cursor-pointer hover:bg-slate-50/50">
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.assetId)}
                    onChange={() => handleAssetToggle(asset.assetId)}
                    className="w-4 h-4 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{asset.assetName}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 capitalize">
                      Category: {asset.category.replace('_', ' ')} | Verification required: <span className="font-bold text-slate-550">{asset.emergencyVerificationLevel}</span>
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reason input */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Detailed Reason for Emergency Request (Min: 20 chars)
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe the urgent situation that warrants access to this sensitive information..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs md:text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400 text-right font-semibold">
              {reason.length} / 1000 characters
            </p>
          </div>

          {/* Priority */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Urgency/Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-semibold"
            >
              <option value="normal">🟢 Normal</option>
              <option value="high">🟡 High Urgency</option>
              <option value="critical">🔴 Critical Emergency</option>
            </select>
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-3">
            <Link
              to="/emergency-access"
              className="px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-red-100"
            >
              {submitting ? 'Submitting Request...' : 'Submit Emergency Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
