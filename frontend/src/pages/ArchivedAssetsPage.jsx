import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssets, restoreAsset, deleteAsset } from '../services/vaultService';

const CATEGORIES = {
  important_documents: { label: 'Important Documents', icon: '📄' },
  financial: { label: 'Financial', icon: '💰' },
  property: { label: 'Property', icon: '🏠' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  digital_accounts: { label: 'Digital Accounts', icon: '🔑' },
  personal_memories: { label: 'Personal Memories', icon: '📸' },
  personal_messages: { label: 'Personal Messages', icon: '✉️' },
  final_instructions: { label: 'Final Instructions', icon: '📝' },
  other: { label: 'Other', icon: '📁' },
};

export default function ArchivedAssetsPage() {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(null);
  const [notification, setNotification] = useState(null);

  async function fetchArchivedAssets() {
    try {
      setLoading(true);
      setErrors(null);
      const res = await getAssets({ status: 'archived' });
      if (res.success) {
        setArchived(res.data.assets);
      } else {
        throw new Error(res.message || 'Failed to fetch archived assets.');
      }
    } catch (err) {
      console.error(err);
      setErrors(err.response?.data?.message || 'Failed to load archived assets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArchivedAssets();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRestore = async (assetId, name) => {
    try {
      const res = await restoreAsset(assetId);
      if (res.success) {
        showNotification(`"${name}" restored to your Legacy Vault.`);
        // Remove from local list
        setArchived(prev => prev.filter(a => a.id !== assetId));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to restore asset. Please try again.');
    }
  };

  const handleDelete = async (assetId, name) => {
    const isConfirmed = window.confirm(
      `CAUTION: Are you sure you want to permanently delete "${name}"?\n\nThis will permanently erase the asset metadata. This action is irreversible.`
    );
    
    if (!isConfirmed) return;

    try {
      const res = await deleteAsset(assetId);
      if (res.success) {
        showNotification(`"${name}" has been permanently deleted.`);
        setArchived(prev => prev.filter(a => a.id !== assetId));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete asset. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
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
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        <Link to="/vault" className="hover:text-indigo-600 transition-colors">My Vault</Link>
        <span>/</span>
        <span className="text-slate-700">Archived Assets</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Archived Assets</h1>
        <p className="mt-1 text-slate-500 text-sm">View or manage items that have been soft-deleted. You can restore them to active or delete them permanently.</p>
      </div>

      {errors && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-800">
          {errors}
        </div>
      )}

      {/* Assets Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-5 h-20 animate-pulse"></div>
          ))}
        </div>
      ) : archived.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800">No archived assets</h3>
          <p className="mt-2 text-slate-500 text-sm">Your archive is empty. Soft-deleted assets from your vault will appear here.</p>
          <Link
            to="/vault"
            className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all"
          >
            Back to Active Vault
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Asset Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {archived.map((asset) => {
                const cat = CATEGORIES[asset.category] || { label: asset.category, icon: '📁' };
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{asset.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{asset.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs px-2.5 py-0.5 rounded-md font-medium">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap uppercase text-xs font-extrabold text-slate-500">
                      {asset.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                      <button
                        onClick={() => handleRestore(asset.id, asset.name)}
                        className="text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id, asset.name)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete Permanently
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
