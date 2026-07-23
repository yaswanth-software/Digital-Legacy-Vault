export default function FilePreview({ file, signedUrl, onClose }) {
  if (!file || !signedUrl) return null;

  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(file.extension?.toLowerCase());

  if (!isImage) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-scale-up relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-150 text-3xl">
              📄
            </div>
            <h3 className="text-base font-bold text-slate-800 break-words px-4">{file.originalName}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Preview is not supported for this file type.</p>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                Download / Open
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If it's an image, render a beautiful full-screen lightbox
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white w-full max-w-7xl mx-auto z-10">
        <div className="overflow-hidden pr-8">
          <h3 className="text-sm md:text-base font-bold truncate max-w-sm md:max-w-2xl">{file.originalName}</h3>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-0.5">Secure Image Preview</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center"
          title="Close preview"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image Containment Zone */}
      <div className="flex-1 flex items-center justify-center w-full max-w-5xl mx-auto my-4 overflow-hidden relative">
        <img
          src={signedUrl}
          alt={file.originalName}
          className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/5 animate-fade-in"
        />
      </div>

      {/* Bottom controls */}
      <div className="w-full text-center pb-2 z-10">
        <a
          href={signedUrl}
          download={file.originalName}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs md:text-sm rounded-xl transition-colors border border-white/10 backdrop-blur"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Original Image
        </a>
      </div>
    </div>
  );
}
