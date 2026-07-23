import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRuleById, updateRule } from '../services/legacyRuleService';
import { getAssets } from '../services/vaultService';
import { getTrustedPeople, configurePermission } from '../services/trustedPeopleService';
import { getSettings } from '../services/continuityService';

export default function EditLegacyRulePage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Db references
  const [allAssets, setAllAssets] = useState([]);
  const [allTrustedPeople, setAllTrustedPeople] = useState([]);
  const [continuitySettings, setContinuitySettings] = useState(null);

  // Form State
  const [ruleInfo, setRuleInfo] = useState({
    name: '',
    description: '',
    priority: 'medium',
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [selectedTpIds, setSelectedTpIds] = useState([]);
  const [conditions, setConditions] = useState({
    trustedConfirmationRequired: true,
    additionalVerificationRequired: false,
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [ruleRes, assetsRes, tpRes, settingsRes] = await Promise.all([
        getRuleById(ruleId),
        getAssets({ status: 'active' }),
        getTrustedPeople(),
        getSettings()
      ]);

      if (ruleRes.success && ruleRes.data.rule) {
        const r = ruleRes.data.rule;
        setRuleInfo({
          name: r.name,
          description: r.description || '',
          priority: r.priority || 'medium',
        });
        setSelectedAssetIds(r.assetIds || []);
        setSelectedTpIds(r.trustedPersonIds || []);
        setConditions({
          trustedConfirmationRequired: r.conditions?.trustedConfirmationRequired !== false,
          additionalVerificationRequired: !!r.conditions?.additionalVerificationRequired
        });
      }

      if (assetsRes.success) setAllAssets(assetsRes.data.assets);
      if (tpRes.success) {
        const activeAccepted = tpRes.data.trustedPeople.filter(
          tp => tp.status === 'active' && tp.invitationStatus === 'accepted'
        );
        setAllTrustedPeople(activeAccepted);
      }
      if (settingsRes.success) setContinuitySettings(settingsRes.data.settings);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve rule details or configurations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ruleId]);

  const handleAssetSelect = (id) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleTpSelect = (id) => {
    setSelectedTpIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (ruleInfo.name.trim().length < 2) {
      alert('Please enter a valid rule name.');
      return;
    }
    if (selectedAssetIds.length === 0) {
      alert('Please select at least one asset.');
      return;
    }
    if (selectedTpIds.length === 0) {
      alert('Please select at least one active trusted person.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: ruleInfo.name,
        description: ruleInfo.description,
        assetIds: selectedAssetIds,
        trustedPersonIds: selectedTpIds,
        conditions: {
          trustedConfirmationRequired: conditions.trustedConfirmationRequired,
          additionalVerificationRequired: conditions.additionalVerificationRequired
        },
        priority: ruleInfo.priority,
      };

      const res = await updateRule(ruleId, payload);
      if (res.success) {
        navigate(`/legacy-rules/${ruleId}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update legacy rule.');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to={`/legacy-rules/${ruleId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Rule Details
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Legacy Rule</h1>
        <p className="mt-1 text-slate-500 text-sm">Modify parameters, target assets, or safety options.</p>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 text-xs font-semibold text-slate-700">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Rule Name *</label>
            <input
              type="text"
              value={ruleInfo.name}
              onChange={(e) => setRuleInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Description</label>
            <textarea
              value={ruleInfo.description}
              onChange={(e) => setRuleInfo(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Select Assets *</label>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {allAssets.map(asset => (
                <label key={asset.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <span>{asset.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={() => handleAssetSelect(asset.id)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-2">Designate Recipients *</label>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {allTrustedPeople.map(tp => (
                <label key={tp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <span>{tp.fullName}</span>
                  <input
                    type="checkbox"
                    checked={selectedTpIds.includes(tp.id)}
                    onChange={() => handleTpSelect(tp.id)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">Verification Steps</h3>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={conditions.trustedConfirmationRequired}
                onChange={(e) => setConditions(prev => ({ ...prev, trustedConfirmationRequired: e.target.checked }))}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800">Require Trusted Person Confirmation</span>
                <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                  Recipients must explicitly confirm unavailability before release rules execute.
                </span>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Link
              to={`/legacy-rules/${ruleId}`}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors bg-white shadow-sm text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              {saving ? 'Saving...' : 'Update Legacy Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
