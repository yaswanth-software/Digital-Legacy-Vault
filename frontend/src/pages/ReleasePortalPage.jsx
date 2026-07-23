import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getReleases,
  getReleaseDetails,
  getReleaseAssets,
  getSecureFileAccess
} from '../services/releaseService';
import { completeVerificationStep, getVerificationDetails } from '../services/verificationService';

export default function ReleasePortalPage() {
  const { releaseId } = useParams();
  const navigate = useNavigate();

  const [releases, setReleases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [assets, setAssets] = useState([]);
  const [verification, setVerification] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadPortal() {
    try {
      setLoading(true);
      setError(null);
      const res = await getReleases('recipient');
      if (res.success) {
        setReleases(res.data.releases);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load release portal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadReleaseDetails(id) {
    try {
      setDetailsLoading(true);
      setError(null);
      
      const [detailsRes, assetsRes] = await Promise.all([
        getReleaseDetails(id),
        getReleaseAssets(id)
      ]);

      if (detailsRes.success) setSelectedRelease(detailsRes.data.release);
      if (assetsRes.success) setAssets(assetsRes.data.assets);

      // If release status requires verification, check verification progress
      if (detailsRes.data.release.status === 'pending' || detailsRes.data.release.status === 'verification_required') {
        const verId = detailsRes.data.release.verificationId;
        if (verId) {
          const verRes = await getVerificationDetails(verId);
          if (verRes.success) setVerification(verRes.data.verification);
        }
      } else {
        setVerification(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load release details.');
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    if (releaseId) {
      loadReleaseDetails(releaseId);
    } else {
      setSelectedRelease(null);
      setAssets([]);
      setVerification(null);
    }
  }, [releaseId]);

  const handleVerifyIdentity = async (verId) => {
    try {
      setVerifyLoading(true);
      const res = await completeVerificationStep(verId, 'identity');
      if (res.success) {
        alert('Identity verification successful!');
        if (releaseId) loadReleaseDetails(releaseId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify identity.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFileAccess = async (assetId, fileId, originalName) => {
    try {
      const res = await getSecureFileAccess(releaseId, assetId, fileId, selectedRelease.accessLevel === 'download' ? 'download' : 'view');
      if (res.success && res.data.url) {
        const a = document.createElement('a');
        a.href = res.data.url;
        a.download = originalName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to access file. Expired or unauthorized.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Side Pane: Releases List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Available Releases</h2>
        <div className="space-y-3">
          {releases.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 italic text-sm">
              No releases configured or triggered for you.
            </div>
          ) : (
            releases.map((rel) => {
              const isActive = rel.id === releaseId;
              const isExpired = rel.status === 'expired' || rel.status === 'revoked';
              return (
                <button
                  key={rel.id}
                  onClick={() => navigate(`/my-releases/${rel.id}`)}
                  className={`w-full text-left bg-white border rounded-2xl p-4 shadow-sm transition-all flex flex-col gap-2 ${
                    isActive ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Release: {rel.id.substring(0, 8)}</span>
                    <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded border ${
                      rel.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'
                    }`}>
                      {rel.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 capitalize">Access Level: {rel.accessLevel.replace('_', ' ')}</h4>
                  <div className="text-[9px] text-slate-400 font-semibold flex justify-between w-full">
                    <span>Assets: {rel.assetIds.length}</span>
                    <span>Expires: {new Date(rel.expiresAt?._seconds ? rel.expiresAt._seconds * 1000 : rel.expiresAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Pane: Selected Release Details */}
      <div className="lg:col-span-2 space-y-6">
        {detailsLoading ? (
          <div className="min-h-[200px] flex items-center justify-center bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : selectedRelease ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-extrabold text-slate-850">Release Portal</h2>
              <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-[10px] uppercase font-bold tracking-wider px-3 py-2 rounded-xl">
                ⚠️ This access is temporary and will expire automatically on: {new Date(selectedRelease.expiresAt?._seconds ? selectedRelease.expiresAt._seconds * 1000 : selectedRelease.expiresAt).toLocaleString()}
              </div>
            </div>

            {/* Verification Status (if pending verification/identity check) */}
            {verification && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider">🔒 Identity Verification Required</h4>
                <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                  You must verify your identity to unlock these legacy assets. The system matches your authenticated Firebase Auth UID with the configured credentials.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    disabled={verifyLoading}
                    onClick={() => handleVerifyIdentity(verification.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                  >
                    {verifyLoading ? 'Verifying...' : 'Authenticate Identity'}
                  </button>
                </div>
              </div>
            )}

            {/* Released Assets */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Released Legacy Assets</h3>
              {selectedRelease.status !== 'active' ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-750 font-bold text-xs">
                  This release is currently {selectedRelease.status}. Access to asset files has been locked/revoked.
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div key={asset.id} className="border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{asset.name}</h4>
                        <span className="inline-block text-[10px] text-slate-400 capitalize mt-0.5">Category: {asset.category.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {asset.description || 'No description provided.'}
                      </p>

                      {/* Display files if allowed */}
                      {selectedRelease.accessLevel !== 'metadata_only' && asset.files && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attached Files</h5>
                          {asset.files.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No files attached to this asset.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {asset.files.map((file) => (
                                <button
                                  key={file.id}
                                  onClick={() => handleFileAccess(asset.id, file.id, file.originalName)}
                                  className="w-full text-left bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl p-3 flex justify-between items-center transition-all"
                                >
                                  <div>
                                    <span className="block text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.originalName}</span>
                                    <span className="block text-[9px] text-slate-450 mt-0.5">Size: {(file.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                  <span className="text-xs">
                                    {selectedRelease.accessLevel === 'download' ? '📥 Download' : '👁️ View'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 italic text-sm shadow-sm">
            Select a release from the list to view its authorized assets and secure files.
          </div>
        )}
      </div>

    </div>
  );
}
