export default function DeleteFileModal({ file, isOpen, onClose, onConfirm, deleting }) {
  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-scale-up">
        {/* Warning Icon */}
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Header */}
        <h3 className="text-lg font-bold text-slate-800">Delete this file?</h3>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Are you sure you want to permanently remove <span className="font-semibold text-slate-700 break-all">"{file.originalName}"</span> from this asset?
        </p>
        <p className="mt-2 text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100/50">
          ⚠️ This action cannot be undone and will delete the file from cloud storage.
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {deleting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Delete File'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
