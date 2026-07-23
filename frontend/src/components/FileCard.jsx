import { useState } from 'react';
import { downloadAssetFile } from '../services/fileService';

export default function FileCard({ file, assetId, onDeleteClick, onPreviewClick }) {
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = (ext) => {
    switch (ext?.toLowerCase()) {
      case 'pdf':
        return { char: '📕', bg: 'bg-red-50 text-red-600 border-red-100' };
      case 'doc':
      case 'docx':
        return { char: '📘', bg: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'xls':
      case 'xlsx':
      case 'csv':
        return { char: '📗', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return { char: '🖼️', bg: 'bg-pink-50 text-pink-600 border-pink-100' };
      case 'txt':
        return { char: '📄', bg: 'bg-slate-50 text-slate-600 border-slate-100' };
      default:
        return { char: '📁', bg: 'bg-slate-50 text-slate-600 border-slate-100' };
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await downloadAssetFile(assetId, file.id);
      if (res.success && res.data.url) {
        // Trigger browser download by opening in new tab or creating link
        const a = document.createElement('a');
        a.href = res.data.url;
        a.download = file.originalName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const iconInfo = getFileIcon(file.extension);
  const isPreviewable = ['png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(file.extension?.toLowerCase());

  const uploadDate = new Date(file.uploadedAt?._seconds ? file.uploadedAt._seconds * 1000 : file.uploadedAt)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-center gap-3.5 overflow-hidden">
        {/* Type Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl border flex-shrink-0 ${iconInfo.bg}`}>
          {iconInfo.char}
        </div>

        {/* Text Details */}
        <div className="overflow-hidden">
          <h4
            onClick={() => isPreviewable && onPreviewClick(file)}
            className={`text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md ${
              isPreviewable ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''
            }`}
            title={file.originalName}
          >
            {file.originalName}
          </h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
            <span>{formatSize(file.size)}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Uploaded {uploadDate}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Preview Option */}
        {isPreviewable && (
          <button
            onClick={() => onPreviewClick(file)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
            title="Preview"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}

        {/* Download Option */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
          title="Download"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>

        {/* Delete Option */}
        <button
          onClick={() => onDeleteClick(file)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
