import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getAssetById, updateAsset } from '../services/vaultService';

const CATEGORIES = [
  { id: 'important_documents', label: 'Important Documents' },
  { id: 'financial', label: 'Financial' },
  { id: 'property', label: 'Property' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'digital_accounts', label: 'Digital Accounts' },
  { id: 'personal_memories', label: 'Personal Memories' },
  { id: 'personal_messages', label: 'Personal Messages' },
  { id: 'final_instructions', label: 'Final Instructions' },
  { id: 'other', label: 'Other' },
];

const ASSET_TYPES = [
  { id: 'document', label: 'Document/File Reference' },
  { id: 'account', label: 'Digital Account/Credentials Reference' },
  { id: 'instruction', label: 'Instructional Guide/List' },
  { id: 'message', label: 'Written Personal Message' },
  { id: 'memory', label: 'Personal Memory/Photo Reference' },
  { id: 'other', label: 'Other Metadata Description' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

export default function EditAssetPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Form Fields State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [assetType, setAssetType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  // Fetch asset details
  useEffect(() => {
    async function fetchAssetDetails() {
      try {
        setFetching(true);
        setErrors([]);
        const res = await getAssetById(assetId);
        if (res.success && res.data.asset) {
          const a = res.data.asset;
          setName(a.name || '');
          setDescription(a.description || '');
          setCategory(a.category || '');
          setAssetType(a.assetType || '');
          setPriority(a.priority || 'medium');
          setNotes(a.notes || '');
          setTags(a.tags || []);
        } else {
          throw new Error('This asset could not be found.');
        }
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.message || 'Failed to retrieve asset details.';
        setErrors([errMsg]);
      } finally {
        setFetching(false);
      }
    }
    fetchAssetDetails();
  }, [assetId]);

  // Handlers for Tag Builder
  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      if (tags.length >= 20) {
        alert('You can add a maximum of 20 tags.');
        return;
      }
      if (cleanTag.length > 30) {
        alert('Tags must be less than 30 characters.');
        return;
      }
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(e);
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Client-side Validation Checks
    const validationErrors = [];
    if (!name.trim() || name.trim().length < 2) {
      validationErrors.push('Asset Name is required and must be at least 2 characters long.');
    }
    if (!category) {
      validationErrors.push('Please select an Asset Category.');
    }
    if (!assetType) {
      validationErrors.push('Please select an Asset Type.');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo(0, 0);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name,
        description,
        category,
        assetType,
        priority,
        notes,
        tags,
      };

      const res = await updateAsset(assetId, payload);
      if (res.success) {
        navigate(`/vault/assets/${assetId}`, { state: { info: 'Changes saved successfully.' } });
      } else {
        setErrors([res.message || 'Failed to update asset.']);
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message || err.response?.data?.errors?.join(', ');
      setErrors([serverMsg || 'Something went wrong while saving changes. Please try again.']);
      window.scrollTo(0, 0);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Fetching asset details...</p>
        </div>
      </div>
    );
  }

  // Render Error state if asset fetching completely failed
  if (errors.length > 0 && !name) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">Asset retrieval failed</h3>
        <p className="mt-2 text-slate-500 text-sm">{errors[0]}</p>
        <Link
          to="/vault"
          className="mt-6 inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
        >
          Return to Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        <Link to="/vault" className="hover:text-indigo-600 transition-colors">My Vault</Link>
        <span>/</span>
        <Link to={`/vault/assets/${assetId}`} className="hover:text-indigo-600 transition-colors truncate max-w-40">{name}</Link>
        <span>/</span>
        <span className="text-slate-700">Edit</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Edit Asset</h1>
        <p className="mt-1 text-slate-500 text-sm">Modify the metadata, priority, or tags for this digital asset.</p>
      </div>

      {/* Save Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-bold text-red-800">Saving failed:</h4>
          </div>
          <ul className="list-disc pl-7 mt-2 text-xs text-red-600 space-y-1">
            {errors.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="assetName" className="block text-sm font-bold text-slate-800 mb-1.5">
            Asset Name <span className="text-red-500">*</span>
          </label>
          <input
            id="assetName"
            type="text"
            placeholder="e.g. Homeowners Insurance Policy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Category & Type Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-bold text-slate-800 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">Select Category</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="assetType" className="block text-sm font-bold text-slate-800 mb-1.5">
              Asset Type <span className="text-red-500">*</span>
            </label>
            <select
              id="assetType"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">Select Asset Type</option>
              {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Priority & Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label htmlFor="priority" className="block text-sm font-bold text-slate-800 mb-1.5">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 bg-white"
            >
              {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-sm font-bold text-slate-800 mb-1.5">
              Tags <span className="text-xs font-semibold text-slate-400">(Optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="tags"
                type="text"
                placeholder="Type and press Enter (e.g. legal, cloud)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Render Tags list */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tags.map((tag, idx) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/50 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-bold text-slate-800 mb-1.5">
            Description <span className="text-xs font-semibold text-slate-400">(Optional)</span>
          </label>
          <textarea
            id="description"
            rows="3"
            placeholder="Provide a brief summary of what this asset is and where it resides..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 resize-y"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-slate-800 mb-1.5">
            Internal Secure Notes <span className="text-xs font-semibold text-slate-400">(Optional, encrypted on release)</span>
          </label>
          <textarea
            id="notes"
            rows="4"
            placeholder="Add detailed instructions, account numbers, or reference keys. These notes are hidden/secure..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to={`/vault/assets/${assetId}`}
            className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-32"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
