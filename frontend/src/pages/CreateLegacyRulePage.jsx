import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAssets } from '../services/vaultService';
import { getTrustedPeople, configurePermission, getPermissions } from '../services/trustedPeopleService';
import { getSettings } from '../services/continuityService';
import { createRule, activateRule } from '../services/legacyRuleService';

const CATEGORY_MAP = {
  important_documents: 'Important Documents',
  financial: 'Financial',
  property: 'Property',
  insurance: 'Insurance',
  digital_accounts: 'Digital Accounts',
  personal_memories: 'Personal Memories',
  personal_messages: 'Personal Messages',
  final_instructions: 'Final Instructions',
  other: 'Other'
};

export default function CreateLegacyRulePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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
  const [accessConfigs, setAccessConfigs] = useState({}); // key tpId_assetId: { accessLevel, releaseMode }
  const [conditions, setConditions] = useState({
    trustedConfirmationRequired: true,
    additionalVerificationRequired: false,
  });
  const [safetyChecked, setSafetyChecked] = useState(false);

  async function loadFormData() {
    try {
      setLoading(true);
      setError(null);

      const [assetsRes, tpRes, settingsRes] = await Promise.all([
        getAssets({ status: 'active' }),
        getTrustedPeople(),
        getSettings()
      ]);

      if (assetsRes.success) setAllAssets(assetsRes.data.assets);
      if (tpRes.success) {
        // Enforce: ONLY accepted, active trusted people can be selected. Filter pending/revoked
        const activeAccepted = tpRes.data.trustedPeople.filter(
          tp => tp.status === 'active' && tp.invitationStatus === 'accepted'
        );
        setAllTrustedPeople(activeAccepted);
      }
      if (settingsRes.success) setContinuitySettings(settingsRes.data.settings);
    } catch (err) {
      console.error(err);
      setError('Failed to load assets or trusted people settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFormData();
  }, []);

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

  const handleAccessLevelChange = (tpId, assetId, level) => {
    const key = `${tpId}_${assetId}`;
    setAccessConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        accessLevel: level,
        releaseMode: prev[key]?.releaseMode || 'manual'
      }
    }));
  };

  const handleReleaseModeChange = (tpId, assetId, mode) => {
    const key = `${tpId}_${assetId}`;
    setAccessConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        releaseMode: mode,
        accessLevel: prev[key]?.accessLevel || 'view'
      }
    }));
  };

  const handleSave = async (shouldActivate) => {
    if (shouldActivate && !safetyChecked) {
      alert('You must confirm that you understand how this rule works before activating.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. First, save access permissions for each selected combination
      const permPromises = [];
      selectedTpIds.forEach(tpId => {
        selectedAssetIds.forEach(assetId => {
          const key = `${tpId}_${assetId}`;
          const config = accessConfigs[key] || { accessLevel: 'view', releaseMode: 'manual' };
          permPromises.push(
            configurePermission(tpId, {
              assetId,
              accessLevel: config.accessLevel,
              releaseMode: config.releaseMode
            })
          );
        });
      });

      await Promise.all(permPromises);

      // 2. Create the legacy rule document
      const payload = {
        name: ruleInfo.name,
        description: ruleInfo.description,
        triggerType: 'missed_check_in',
        assetIds: selectedAssetIds,
        trustedPersonIds: selectedTpIds,
        conditions: {
          trustedConfirmationRequired: conditions.trustedConfirmationRequired,
          additionalVerificationRequired: conditions.additionalVerificationRequired
        },
        priority: ruleInfo.priority,
      };

      const res = await createRule(payload);
      if (res.success) {
        const ruleId = res.data.rule.id;
        if (shouldActivate) {
          // 3. Immediately activate the rule if requested
          await activateRule(ruleId);
        }
        navigate('/legacy-rules');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save legacy rule.');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && ruleInfo.name.trim().length < 2) {
      alert('Please enter a valid rule name.');
      return;
    }
    if (step === 2 && selectedAssetIds.length === 0) {
      alert('Please select at least one asset.');
      return;
    }
    if (step === 3 && selectedTpIds.length === 0) {
      alert('Please select at least one active trusted person.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/legacy-rules" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Legacy Rules
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        {/* Step Indicator */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6 text-xs text-slate-400 font-bold">
          <span>Step {step} of 7</span>
          <span className="uppercase tracking-wider text-indigo-650">
            {step === 1 && '1. Rule Info'}
            {step === 2 && '2. Select Assets'}
            {step === 3 && '3. Designated Recipients'}
            {step === 4 && '4. Access Configurations'}
            {step === 5 && '5. Trigger Timeline'}
            {step === 6 && '6. Safety Verification'}
            {step === 7 && '7. Review & Activate'}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Step 1: Info */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Rule Information</h2>
            <p className="text-xs text-slate-500">Provide a description name for your legacy rule.</p>
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rule Name *</label>
              <input
                type="text"
                id="name"
                value={ruleInfo.name}
                onChange={(e) => setRuleInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Critical Credentials Emergency Release"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description / Purpose</label>
              <textarea
                id="description"
                value={ruleInfo.description}
                onChange={(e) => setRuleInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Explain the purpose of this rule (optional)..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Level</label>
              <select
                id="priority"
                value={ruleInfo.priority}
                onChange={(e) => setRuleInfo(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Assets */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Select Assets</h2>
            <p className="text-xs text-slate-500">Select which digital assets will be regulated under this rule.</p>
            
            {allAssets.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No active vault assets found. Create some assets first.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {allAssets.map(asset => (
                  <div
                    key={asset.id}
                    onClick={() => handleAssetSelect(asset.id)}
                    className={`border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                      selectedAssetIds.includes(asset.id)
                        ? 'border-indigo-400 bg-indigo-50/10'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">{asset.name}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{CATEGORY_MAP[asset.category] || asset.category}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(asset.id)}
                      readOnly
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Trusted People */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Designate Recipients</h2>
            <p className="text-xs text-slate-500">Choose which trusted people are authorized to confirm unavailability and inherit configured access.</p>

            {allTrustedPeople.length === 0 ? (
              <div className="bg-amber-50 border border-amber-150 rounded-2xl p-4.5 text-center text-amber-800 text-xs">
                ⚠️ You don't have any accepted active trusted people in your list. Pending invitations cannot be used for active rules. Go to Trusted People to add members and verify they accept.
              </div>
            ) : (
              <div className="space-y-3">
                {allTrustedPeople.map(tp => (
                  <div
                    key={tp.id}
                    onClick={() => handleTpSelect(tp.id)}
                    className={`border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                      selectedTpIds.includes(tp.id)
                        ? 'border-indigo-400 bg-indigo-50/10'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">{tp.fullName}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{tp.email}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTpIds.includes(tp.id)}
                      readOnly
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Access Configurations */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Configure Access</h2>
            <p className="text-xs text-slate-500">Configure access levels and release permissions for each designated recipient.</p>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {selectedTpIds.map(tpId => {
                const tpObj = allTrustedPeople.find(x => x.id === tpId);
                return (
                  <div key={tpId} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="block font-bold text-slate-800 text-xs pb-2 border-b border-slate-100">
                      Recipients: {tpObj?.fullName}
                    </span>
                    {selectedAssetIds.map(assetId => {
                      const assetObj = allAssets.find(x => x.id === assetId);
                      const key = `${tpId}_${assetId}`;
                      const config = accessConfigs[key] || { accessLevel: 'view', releaseMode: 'manual' };

                      return (
                        <div key={assetId} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center py-2 text-xs">
                          <span className="font-semibold text-slate-650 truncate">{assetObj?.name}</span>
                          <select
                            value={config.accessLevel}
                            onChange={(e) => handleAccessLevelChange(tpId, assetId, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                          >
                            <option value="metadata_only">👁️ Metadata Only</option>
                            <option value="view">📄 View Contents</option>
                            <option value="download">📥 Download Files</option>
                          </select>
                          <select
                            value={config.releaseMode}
                            onChange={(e) => handleReleaseModeChange(tpId, assetId, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                          >
                            <option value="manual">👤 Manual Release</option>
                            <option value="future_rule">⚙️ Future Rule</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Trigger Timeline */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Configure Trigger</h2>
            <p className="text-xs text-slate-500">Verify check-in trigger timelines linked to this rule.</p>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Trigger Event</span>
                <span className="text-xs font-bold text-indigo-700 uppercase">Missed Check-in</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Check-in frequency</span>
                  <span className="font-bold text-slate-700">{continuitySettings?.checkInFrequencyDays || 90} Days</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Grace period buffer</span>
                  <span className="font-bold text-slate-700">{continuitySettings?.gracePeriodDays || 14} Days</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                If check-in settings are not found, or you wish to modify frequencies, please save this rule as a draft and go to **Continuity Settings** first.
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Safety Verification */}
        {step === 6 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Safety Verification</h2>
            <p className="text-xs text-slate-500">Determine whether additional confirmations are required before releasing asset access.</p>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Trusted Person Confirmation Required</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    If checked, designated recipients must confirm your unavailability before rule eligibility can be satisfied.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={conditions.trustedConfirmationRequired}
                  onChange={(e) => setConditions(prev => ({ ...prev, trustedConfirmationRequired: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 flex-shrink-0 mt-1"
                />
              </div>

              <div className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Additional Verification Flag</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Flags the rule as requiring additional confirmation/legal verification events before eligibility is approved.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={conditions.additionalVerificationRequired}
                  onChange={(e) => setConditions(prev => ({ ...prev, additionalVerificationRequired: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 flex-shrink-0 mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Review & Save */}
        {step === 7 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Review & Activate</h2>
            <p className="text-xs text-slate-500 font-semibold mb-4">Confirm configurations before saving.</p>

            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-medium text-slate-700">
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-400 font-semibold">Rule Name</span>
                <span className="font-bold text-slate-850">{ruleInfo.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-400 font-semibold">Selected Assets count</span>
                <span className="font-bold text-slate-850">{selectedAssetIds.length} Assets</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-400 font-semibold">Designated Recipients</span>
                <span className="font-bold text-slate-850">
                  {selectedTpIds.map(id => allTrustedPeople.find(x => x.id === id)?.fullName).join(', ')}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-400 font-semibold">Trigger Condition</span>
                <span className="font-bold text-indigo-650">Missed Check-in</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-400 font-semibold">Verification confirmation</span>
                <span className="font-bold text-slate-850">
                  {conditions.trustedConfirmationRequired ? 'Trusted Confirmation Required' : 'No confirmation required'}
                </span>
              </div>
            </div>

            {/* Safety Checkbox */}
            <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 text-indigo-850 mt-6 space-y-4">
              <h4 className="font-extrabold text-sm text-indigo-900 flex items-center gap-1.5">
                🛡️ Important Safety Commitment
              </h4>
              <p className="text-[11px] leading-relaxed font-semibold">
                LegacyOS will never release your sensitive files or accounts based on a timeout alone. Access permissions will only reach review status when verification is complete.
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyChecked}
                  onChange={(e) => setSafetyChecked(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 flex-shrink-0 mt-0.5"
                />
                <span className="text-[11px] font-bold text-indigo-900 leading-normal select-none">
                  I understand how this rule works and confirm the settings.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Wizard Footer controls */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors bg-white shadow-sm"
            >
              Previous Step
            </button>
          )}

          {step < 7 ? (
            <button
              onClick={nextStep}
              className="flex-grow inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              Next Step
            </button>
          ) : (
            <div className="flex-grow flex gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors bg-white shadow-sm"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || !safetyChecked}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Activate Rule'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
