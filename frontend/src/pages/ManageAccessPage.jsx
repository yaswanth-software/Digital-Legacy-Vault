import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTrustedPersonById,
  getPermissions,
  configurePermission
} from '../services/trustedPeopleService';
import { getAssets } from '../services/vaultService';

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

const ASSET_TYPES = {
  document: 'Document',
  account: 'Account/Credential',
  instruction: 'Instruction',
  message: 'Personal Message',
  memory: 'Memory/Photo',
  other: 'Other',
};

export default function ManageAccessPage() {
  const { trustedPersonId } = useParams();
  const navigate = useNavigate();

  const [tp, setTp] = useState(null);
  const [assets, setAssets] = useState([]);
  const [permissionsMap, setPermissionsMap] = useState({}); // keyed by assetId: { accessLevel, releaseMode, id }
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tpRes, permRes, assetsRes] = await Promise.all([
        getTrustedPersonById(trustedPersonId),
        getPermissions(trustedPersonId),
        getAssets({ status: 'all' })
      ]);

      if (tpRes.success) {
        setTp(tpRes.data.trustedPerson);
      }

      if (assetsRes.success) {
        // Only allow configuring active (non-archived) assets
        const activeAssets = assetsRes.data.assets.filter(a => a.status === 'active');
        setAssets(activeAssets);
      }

      if (permRes.success && permRes.data.permissions) {
        // Construct map of permission configurations
        const pMap = {};
        permRes.data.permissions.forEach(p => {
          pMap[p.assetId] = {
            id: p.id,
            accessLevel: p.accessLevel,
            releaseMode: p.releaseMode,
            emergencyAccessEnabled: !!p.emergencyAccessEnabled,
            emergencyVerificationLevel: p.emergencyVerificationLevel || 'high'
          };
        });
        setPermissionsMap(pMap);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load access configurations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [trustedPersonId]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAccessLevelChange = (assetId, level) => {
    setPermissionsMap(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        accessLevel: level,
        // Default releaseMode to manual if initializing
        releaseMode: prev[assetId]?.releaseMode || 'manual',
        emergencyAccessEnabled: prev[assetId]?.emergencyAccessEnabled || false,
        emergencyVerificationLevel: prev[assetId]?.emergencyVerificationLevel || 'high'
      }
    }));
  };

  const handleReleaseModeChange = (assetId, mode) => {
    setPermissionsMap(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        releaseMode: mode,
        accessLevel: prev[assetId]?.accessLevel || 'view'
      }
    }));
  };

  const handleEmergencyEnabledChange = (assetId, enabled) => {
    setPermissionsMap(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        emergencyAccessEnabled: enabled,
        accessLevel: prev[assetId]?.accessLevel || 'view'
      }
    }));
  };

  const handleEmergencyVerificationLevelChange = (assetId, level) => {
    setPermissionsMap(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        emergencyVerificationLevel: level,
        accessLevel: prev[assetId]?.accessLevel || 'view'
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save all configurations sequentially
      // For MVP, save them in parallel/loop
      const savePromises = assets.map(async (asset) => {
        const config = permissionsMap[asset.id] || { accessLevel: 'no_access', releaseMode: 'manual', emergencyAccessEnabled: false, emergencyVerificationLevel: 'high' };
        // Save to backend
        return configurePermission(trustedPersonId, {
          assetId: asset.id,
          accessLevel: config.accessLevel,
          releaseMode: config.releaseMode,
          emergencyAccessEnabled: !!config.emergencyAccessEnabled,
          emergencyVerificationLevel: config.emergencyVerificationLevel || 'high'
        });
      });

      await Promise.all(savePromises);
      showNotification('Access configurations saved successfully!');
      
      // Reload details page
      setTimeout(() => {
        navigate(`/trusted-people/${trustedPersonId}`);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save configurations. Please try again.');
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

  if (error && assets.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-5 text-center max-w-lg mx-auto">
        <h4 className="font-bold text-sm">Failed to load data</h4>
        <p className="text-xs mt-1">{error}</p>
        <Link to={`/trusted-people/${trustedPersonId}`} className="mt-4 inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          Back to details
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to={`/trusted-people/${trustedPersonId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to details for {tp?.fullName}
        </Link>
      </div>

      {/* Header Info */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manage Access for {tp?.fullName}</h1>
        <p className="mt-1 text-slate-500 text-sm">Configure asset-specific access permissions and release triggers.</p>
      </div>

      {/* Warnings & Notices */}
      <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 mb-8 text-indigo-850 flex items-start gap-3">
        <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs leading-relaxed font-semibold">
          <h4 className="font-extrabold text-indigo-900 text-sm mb-0.5">🔒 Inactive Permissions Confirmation</h4>
          This permission configuration is currently inactive. Access will not be granted immediately. Your trusted person cannot view or access files until a designated legacy verification rule (e.g. proof of demise or check-in timeouts) is satisfied in the future.
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {assets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-sm">
            There are no active assets in your Legacy Vault. Add some assets first to configure access.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Asset Type</th>
                  <th className="px-6 py-4">Access Level</th>
                  <th className="px-6 py-4">Release Mode</th>
                  <th className="px-6 py-4">Emergency Access</th>
                  <th className="px-6 py-4">Verification Level</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {assets.map((asset) => {
                  const currentConfig = permissionsMap[asset.id] || { 
                    accessLevel: 'no_access', 
                    releaseMode: 'manual',
                    emergencyAccessEnabled: false,
                    emergencyVerificationLevel: 'high'
                  };
                  
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Category */}
                      <td className="px-6 py-4">
                        <span className="block font-bold text-slate-800">{asset.name}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{CATEGORY_MAP[asset.category] || asset.category}</span>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {ASSET_TYPES[asset.assetType] || asset.assetType}
                      </td>

                      {/* Access Level Selector */}
                      <td className="px-6 py-4">
                        <select
                          value={currentConfig.accessLevel}
                          onChange={(e) => handleAccessLevelChange(asset.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-w-[130px] font-semibold"
                        >
                          <option value="no_access">❌ No Access</option>
                          <option value="metadata_only">👁️ Metadata Only</option>
                          <option value="view">📄 View contents</option>
                          <option value="download">📥 Download files</option>
                        </select>
                      </td>

                      {/* Release Mode Selector */}
                      <td className="px-6 py-4">
                        <select
                          value={currentConfig.releaseMode}
                          disabled={currentConfig.accessLevel === 'no_access'}
                          onChange={(e) => handleReleaseModeChange(asset.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-w-[130px] font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="manual">👤 Manual Release</option>
                          <option value="future_rule">⚙️ Future Rule</option>
                        </select>
                      </td>

                      {/* Emergency Access Switch/Checkbox */}
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={currentConfig.accessLevel === 'no_access'}
                            checked={!!currentConfig.emergencyAccessEnabled}
                            onChange={(e) => handleEmergencyEnabledChange(asset.id, e.target.checked)}
                            className="w-4 h-4 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span className="ml-2 text-xs font-semibold text-slate-600">Enabled</span>
                        </label>
                      </td>

                      {/* Verification Level Selector */}
                      <td className="px-6 py-4">
                        <select
                          value={currentConfig.emergencyVerificationLevel || 'high'}
                          disabled={currentConfig.accessLevel === 'no_access' || !currentConfig.emergencyAccessEnabled}
                          onChange={(e) => handleEmergencyVerificationLevelChange(asset.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-w-[110px] font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="basic">🟢 Basic</option>
                          <option value="standard">🟡 Standard</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </td>

                      {/* Status indicator */}
                      <td className="px-6 py-4 text-center">
                        {currentConfig.accessLevel === 'no_access' ? (
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 animate-pulse">
                            Configured
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3">
          <Link
            to={`/trusted-people/${trustedPersonId}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl transition-colors bg-white shadow-sm"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || assets.length === 0}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save Configurations'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
