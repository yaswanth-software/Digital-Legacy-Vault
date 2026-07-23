import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReleaseActivityLogs, getReleaseDetails } from '../services/releaseService';

export default function ReleaseActivityPage() {
  const { releaseId } = useParams();
  const [logs, setLogs] = useState([]);
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      const [logsRes, detailsRes] = await Promise.all([
        getReleaseActivityLogs(releaseId),
        getReleaseDetails(releaseId)
      ]);
      if (logsRes.success) setLogs(logsRes.data.logs);
      if (detailsRes.success) setRelease(detailsRes.data.release);
    } catch (err) {
      console.error(err);
      setError('Failed to load release activity logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (releaseId) {
      loadLogs();
    }
  }, [releaseId]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/releases" className="text-xs text-indigo-650 hover:underline font-semibold flex items-center gap-1.5 mb-2">
          &larr; Back to Manage Releases
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">📊 Release Audit Logs</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Detailed history of file view and download actions authorized under Release ID: <span className="font-mono font-bold text-slate-800">{releaseId}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {release && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-xs font-semibold text-slate-650 flex flex-col md:flex-row gap-4 justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recipient</span>
            <span className="text-slate-800 text-sm font-bold block mt-0.5">{release.recipientId}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Access Level</span>
            <span className="text-slate-800 text-sm font-bold block mt-0.5 capitalize">{release.accessLevel}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Expires At</span>
            <span className="text-slate-800 text-sm font-bold block mt-0.5">
              {new Date(release.expiresAt?._seconds ? release.expiresAt._seconds * 1000 : release.expiresAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-sm">
            No access or download actions have been recorded yet for this release.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Asset ID</th>
                  <th className="px-6 py-4">File ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                      {log.actorId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                        log.action === 'release_downloaded' ? 'bg-indigo-50 text-indigo-755 border-indigo-150' : 'bg-slate-100 text-slate-650 border-slate-200'
                      }`}>
                        {log.action.replace('release_', '')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-450">
                      {log.assetId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-450">
                      {log.fileId ? `${log.fileId.substring(0, 8)}...` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-450">
                      {new Date(log.timestamp?._seconds ? log.timestamp._seconds * 1000 : log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
