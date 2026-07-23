import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getRequestsSubmittedBy,
  getIncomingRequests,
  approveRequest,
  denyRequest,
  requestVerification
} from '../services/emergencyAccessService';

export default function EmergencyAccessPage() {
  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  async function loadRequests() {
    try {
      setLoading(true);
      setError(null);
      const [myRes, incomingRes] = await Promise.all([
        getRequestsSubmittedBy(),
        getIncomingRequests()
      ]);
      if (myRes.success) setMyRequests(myRes.data.requests);
      if (incomingRes.success) setIncomingRequests(incomingRes.data.requests);
    } catch (err) {
      console.error(err);
      setError('Failed to load emergency access requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this emergency access request? This will create a controlled release.')) return;
    try {
      setActionLoading(true);
      const res = await approveRequest(id);
      if (res.success) {
        triggerToast('Request approved and controlled release created.');
        loadRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (id) => {
    if (!window.confirm('Are you sure you want to deny this emergency request?')) return;
    try {
      setActionLoading(true);
      const res = await denyRequest(id);
      if (res.success) {
        triggerToast('Request denied.');
        loadRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deny request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestVerification = async (id, level) => {
    try {
      setActionLoading(true);
      const res = await requestVerification(id, level);
      if (res.success) {
        triggerToast(`Verification level set to ${level}.`);
        loadRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update verification level.');
    } finally {
      setActionLoading(false);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 border border-slate-800 animate-slide-in">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">🚨 Emergency Access</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Request emergency access to legacy assets, or review incoming requests.
          </p>
        </div>
        <div>
          <Link
            to="/emergency-access/request"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-red-100"
          >
            Request Emergency Access
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: My Requests (Trusted Person View) */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">My Submitted Requests</h2>
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 italic text-sm">
                You have not submitted any emergency access requests.
              </div>
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-450">ID: {req.id.substring(0, 8)}</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">Priority: <span className="capitalize text-red-650">{req.priority}</span></h4>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                      req.status === 'released' || req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                      req.status === 'denied' || req.status === 'expired' || req.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-150' :
                      'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                    "{req.reason}"
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold flex justify-between">
                    <span>Requested Assets: {req.requestedAssetIds.length}</span>
                    <span>Created: {new Date(req.createdAt?._seconds ? req.createdAt._seconds * 1000 : req.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Action Link for Release / Verification Details */}
                  {req.status === 'released' && (
                    <Link
                      to="/my-releases"
                      className="block text-center text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl transition-colors border border-indigo-150"
                    >
                      📂 View Active Release Portal
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Incoming Requests (Owner View) */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Incoming Requests</h2>
          <div className="space-y-4">
            {incomingRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 italic text-sm">
                No incoming emergency access requests.
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-450">ID: {req.id.substring(0, 8)}</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">Requested Assets: {req.requestedAssetIds.length}</h4>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                      req.status === 'released' || req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                      req.status === 'denied' || req.status === 'expired' || req.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-150' :
                      'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                    "{req.reason}"
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold flex justify-between">
                    <span>Priority: <span className="capitalize font-bold text-red-650">{req.priority}</span></span>
                    <span>Created: {new Date(req.createdAt?._seconds ? req.createdAt._seconds * 1000 : req.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Owner review actions */}
                  {(req.status === 'pending' || req.status === 'verification_required' || req.status === 'under_review') && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
                        >
                          Approve Release
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleDeny(req.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
                        >
                          Deny Request
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleRequestVerification(req.id, 'standard')}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          Req Standard Verification
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleRequestVerification(req.id, 'high')}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          Req High Verification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
