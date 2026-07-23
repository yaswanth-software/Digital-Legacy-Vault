import FileCard from './FileCard';

export default function FileList({ files, assetId, onDeleteClick, onPreviewClick, onAttachFilesClick }) {
  if (!files || files.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-800">No files attached yet.</h3>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Securely attach important documents, keys, backup statements, or photos related to this asset.
        </p>
        {onAttachFilesClick && (
          <button
            onClick={onAttachFilesClick}
            className="mt-5 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            Attach Files
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {files.map(file => (
        <FileCard
          key={file.id}
          file={file}
          assetId={assetId}
          onDeleteClick={onDeleteClick}
          onPreviewClick={onPreviewClick}
        />
      ))}
    </div>
  );
}
