import { useState, useRef } from 'react';
import { uploadAssetFiles } from '../services/fileService';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES_PER_UPLOAD = 5;
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'js', 'msi', 'dll', 'scr', 'com', 
  'vbs', 'pif', 'cpl', 'wsf', 'jar', 'gadget', 'py', 'ps1'
];

export default function FileUploader({ 
  assetId, 
  onUploadSuccess, 
  onStagedChange,
  currentFilesCount = 0, 
  maxFilesLimit = 50,
  autoUpload = true
}) {
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const updateStagedFiles = (newStaged) => {
    setStagedFiles(newStaged);
    if (onStagedChange) {
      onStagedChange(newStaged);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const handleFileSelection = (newFiles) => {
    setError(null);

    // Limit checks
    if (currentFilesCount + stagedFiles.length + newFiles.length > maxFilesLimit) {
      setError(`File limit reached for this asset. Maximum total files allowed is ${maxFilesLimit}.`);
      return;
    }

    if (stagedFiles.length + newFiles.length > MAX_FILES_PER_UPLOAD) {
      setError(`You can stage a maximum of ${MAX_FILES_PER_UPLOAD} files per upload action.`);
      return;
    }

    const validated = [];
    const errors = [];

    newFiles.forEach(file => {
      const parts = file.name.split('.');
      const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

      if (DANGEROUS_EXTENSIONS.includes(ext) || !ext) {
        errors.push(`"${file.name}": Executable or dangerous file types are not allowed.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}": File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }

      // Check duplicates in currently staged
      if (stagedFiles.some(f => f.name === file.name)) {
        return;
      }

      validated.push(file);
    });

    if (errors.length > 0) {
      setError(errors[0]); // show first error
    }

    if (validated.length > 0) {
      const updated = [...stagedFiles, ...validated];
      updateStagedFiles(updated);
    }
  };

  const removeStagedFile = (index) => {
    const updated = stagedFiles.filter((_, i) => i !== index);
    updateStagedFiles(updated);
    setError(null);
  };

  const handleUpload = async () => {
    if (stagedFiles.length === 0 || !assetId) return;

    setUploading(true);
    setError(null);
    setProgress({});

    const formData = new FormData();
    stagedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await uploadAssetFiles(assetId, formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress({ all: percentCompleted });
      });

      if (res.success) {
        updateStagedFiles([]);
        setProgress({});
        if (onUploadSuccess) {
          onUploadSuccess(res.data.files);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current.click();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileBrowser}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-slate-100">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-800">
          Drag and drop files here, or <span className="text-indigo-600 hover:text-indigo-700">browse</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
          PDF, DOC, DOCX, JPG, PNG and more. Maximum {MAX_FILE_SIZE_MB} MB per file.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Staged Files List */}
      {stagedFiles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
          <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selected Files ({stagedFiles.length})
            </span>
            {stagedFiles.length > 0 && !uploading && assetId && autoUpload && (
              <button
                onClick={handleUpload}
                className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Upload Files
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {stagedFiles.map((file, idx) => (
              <div key={file.name} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-xl">📄</div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-xs md:max-w-md">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${progress.all || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{progress.all || 0}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => removeStagedFile(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
