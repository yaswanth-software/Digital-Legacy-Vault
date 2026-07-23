import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getAssetById, archiveAsset } from '../services/vaultService';
import { getAssetFiles, deleteAssetFile, downloadAssetFile } from '../services/fileService';
import FileUploader from '../components/FileUploader';
import FileList from '../components/FileList';
import FilePreview from '../components/FilePreview';
import DeleteFileModal from '../components/DeleteFileModal';

const CATEGORIES = {
  important_documents: { label: 'Important Documents', icon: '📄', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  financial: { label: 'Financial', icon: '💰', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  property: { label: 'Property', icon: '🏠', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  insurance: { label: 'Insurance', icon: '🛡️', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  digital_accounts: { label: 'Digital Accounts', icon: '🔑', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  personal_memories: { label: 'Personal Memories', icon: '📸', color: 'text-pink-700 bg-pink-50 border-pink-200' },
  personal_messages: { label: 'Personal Messages', icon: '✉️', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  final_instructions: { label: 'Final Instructions', icon: '📝', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  other: { label: 'Other', icon: '📁', color: 'text-slate-700 bg-slate-50 border-slate-200' },
};

const ASSET_TYPES = {
  document: 'Document Reference',
  account: 'Digital Account Reference',
  instruction: 'Instructional Guide',
  message: 'Personal Message',
  memory: 'Digital Memory/Media',
  other: 'Other Reference',
};

const PRIORITIES = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium: { label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'High', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', badge: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },
};

export default function AssetDetailsPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [notification, setNotification] = useState(location.state?.info || null);

  // File States
  const [files, setFiles] = useState([]);
  const [selectedFileForDelete, setSelectedFileForDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    async function fetchAssetData() {
      try {
        setLoading(true);
        setErrors(null);
        // Fetch asset and files in parallel
        const [assetRes, filesRes] = await Promise.all([
          getAssetById(assetId),
          getAssetFiles(assetId)
        ]);

        if (assetRes.success && assetRes.data.asset) {
          setAsset(assetRes.data.asset);
        } else {
          throw new Error('This asset could not be found.');
        }

        if (filesRes.success && filesRes.data.files) {
          setFiles(filesRes.data.files);
        }
      } catch (err) {
        console.error(err);
        setErrors(err.response?.data?.message || 'Failed to retrieve asset details.');
      } finally {
        setLoading(false);
      }
    }
    fetchAssetData();
  }, [assetId]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleArchive = async () => {
    if (archiving) return;
    try {
      setArchiving(true);
      const res = await archiveAsset(assetId);
      if (res.success) {
        navigate('/vault', { state: { info: `Asset "${asset.name}" moved to archives.` } });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to archive asset. Please try again.');
    } finally {
      setArchiving(false);
    }
  };

  const handleUploadSuccess = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
    showNotification('Files attached successfully.');
    setShowUploader(false);
  };

  const handleDeleteClick = (file) => {
    setSelectedFileForDelete(file);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFileForDelete) return;
    try {
      setDeletingFile(true);
      const res = await deleteAssetFile(assetId, selectedFileForDelete.id);
      if (res.success) {
        setFiles(prev => prev.filter(f => f.id !== selectedFileForDelete.id));
        showNotification('File deleted successfully.');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete file. Please try again.');
    } finally {
      setDeletingFile(false);
      setSelectedFileForDelete(null);
    }
  };

  const handlePreviewClick = async (file) => {
    try {
      setLoadingPreview(true);
      const res = await downloadAssetFile(assetId, file.id);
      if (res.success && res.data.url) {
        const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(file.extension?.toLowerCase());
        if (isImage) {
          setPreviewFile(file);
          setPreviewUrl(res.data.url);
        } else {
          // Open PDF directly in new tab using temporary signed URL
          window.open(res.data.url, '_blank');
        }
      }
    } catch (err) {
      console.error('Failed to load file preview:', err);
      alert('Failed to load file preview. Please try again.');
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (errors || !asset) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">Asset not found</h3>
        <p className="mt-2 text-slate-500 text-sm">{errors || 'The asset details could not be loaded.'}</p>
        <Link
          to="/vault"
          className="mt-6 inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
        >
          Return to Vault
        </Link>
      </div>
    );
  }

  const catInfo = CATEGORIES[asset.category] || { label: asset.category, icon: '📁', color: '' };
  const prioInfo = PRIORITIES[asset.priority] || { label: asset.priority, badge: 'bg-slate-100' };

  const createdDate = new Date(asset.createdAt?._seconds ? asset.createdAt._seconds * 1000 : asset.createdAt)
    .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const updatedDate = new Date(asset.updatedAt?._seconds ? asset.updatedAt._seconds * 1000 : asset.updatedAt)
    .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
        <span className="text-slate-700 truncate max-w-xs">{asset.name}</span>
      </nav>

      {/* Actions & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="text-4xl p-2.5 bg-slate-100 rounded-2xl flex-shrink-0">
            {catInfo.icon}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">{asset.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${catInfo.color}`}>
                {catInfo.label}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {ASSET_TYPES[asset.assetType] || asset.assetType}
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${prioInfo.badge}`}>
                {prioInfo.label} Priority
              </span>
              {asset.status === 'archived' && (
                <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                  Archived
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {asset.status !== 'archived' ? (
            <>
              <Link
                to={`/vault/assets/${assetId}/edit`}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Asset
              </Link>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Archive Asset
              </button>
            </>
          ) : (
            <Link
              to="/vault/archived"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              Restore or Delete
            </Link>
          )}
        </div>
      </div>

      {/* Grid Layout Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Description & Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Asset Description</h3>
            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
              {asset.description || <span className="text-slate-400 italic">No description has been added.</span>}
            </p>
          </div>

          {/* Secure Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4.5 h-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Secure Access Notes</h3>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-slate-700 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {asset.notes || <span className="text-slate-400 italic">No access notes provided.</span>}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3.5">Asset Tags</h3>
            <div className="flex flex-wrap gap-2">
              {asset.tags && asset.tags.length > 0 ? (
                asset.tags.map(t => (
                  <span key={t} className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-xl">
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No tags added.</span>
              )}
            </div>
          </div>

          {/* Secure File Attachments Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Secure File Attachments</h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                  {files.length} / 50 Files
                </span>
              </div>
              {asset.status !== 'archived' && (
                <button
                  onClick={() => setShowUploader(!showUploader)}
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs rounded-xl border border-indigo-100 transition-colors shadow-sm"
                >
                  {showUploader ? 'Cancel' : 'Attach Files'}
                </button>
              )}
            </div>

            {/* File Upload Mode */}
            {showUploader && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <FileUploader
                  assetId={assetId}
                  onUploadSuccess={handleUploadSuccess}
                  currentFilesCount={files.length}
                />
              </div>
            )}

            {/* Loading Indicator */}
            {loadingPreview && (
              <div className="mb-4 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-xl p-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Securing file access link...</span>
              </div>
            )}

            {/* File List */}
            <FileList
              files={files}
              assetId={assetId}
              onDeleteClick={handleDeleteClick}
              onPreviewClick={handlePreviewClick}
              onAttachFilesClick={asset.status !== 'archived' ? () => setShowUploader(true) : null}
            />
          </div>

        </div>

        {/* Right 1 Column: Meta Details and Coming Soon Section */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Metadata</h3>
            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Asset ID</span>
                <span className="font-mono text-slate-700 select-all bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{asset.id}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Created Date</span>
                <span className="font-medium text-slate-700">{createdDate}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Last Modified</span>
                <span className="font-medium text-slate-700">{updatedDate}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold mb-0.5">Status</span>
                <span className={`inline-flex items-center gap-1.5 font-bold uppercase ${
                  asset.status === 'active' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    asset.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                  {asset.status}
                </span>
              </div>
            </div>
          </div>

          {/* Coming Soon Box 2: Trusted People */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/50 opacity-40"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Trusted Recipients</h4>
                <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Soon</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Designate trusted people (beneficiaries) who should inherit this specific asset.</p>
              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/30 text-xs font-semibold text-slate-400">
                Trusted access will be configured soon.
              </div>
            </div>
          </div>

          {/* Coming Soon Box 3: Release Rules */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/50 opacity-40"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Release Rules</h4>
                <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Soon</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Configure triggers that authorize releasing this asset (e.g. proof of demise, check-in timeout).</p>
              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/30 text-xs font-semibold text-slate-400">
                Release rules will be available soon.
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* File Preview Overlay */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          signedUrl={previewUrl}
          onClose={() => {
            setPreviewFile(null);
            setPreviewUrl('');
          }}
        />
      )}

      {/* Delete File Confirmation Modal */}
      <DeleteFileModal
        file={selectedFileForDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedFileForDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        deleting={deletingFile}
      />
    </div>
  );
}
