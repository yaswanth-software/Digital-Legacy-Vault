import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { previewInvitation, acceptInvitation } from '../services/trustedPeopleService';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const vaultId = searchParams.get('vaultId');
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadInvitationPreview() {
      if (!token) {
        setError('Invalid invitation link. No token provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await previewInvitation(token, vaultId, id);
        if (res.success && res.data.preview) {
          setPreview(res.data.preview);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to verify invitation. The link may have expired or been revoked.');
      } finally {
        setLoading(false);
      }
    }
    loadInvitationPreview();
  }, [token, vaultId, id]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await acceptInvitation(token, vaultId, id);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const loginRedirectUrl = `/login?redirect=${encodeURIComponent(`/trusted-invite/accept?token=${token}&vaultId=${vaultId}&id=${id}`)}`;
  const registerRedirectUrl = `/register?redirect=${encodeURIComponent(`/trusted-invite/accept?token=${token}&vaultId=${vaultId}&id=${id}`)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-sm text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-500">Verifying secure invitation details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-sm">
        <div className="text-center">
          {/* Logo Placeholder */}
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-md shadow-indigo-100">
            L
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight">LegacyOS</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-bold uppercase tracking-wider">Trusted Person Invitation</p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4 flex items-start gap-2.5 leading-relaxed">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold">Verification Failed</span>
              <p className="mt-1 font-medium text-red-600">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 text-center animate-fade-in space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-emerald-100">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-800">Invitation Accepted!</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              You are now linked as a Trusted Person for **{preview?.inviterName}**.
            </p>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left text-xs leading-relaxed text-indigo-750 font-semibold max-w-md mx-auto">
              ℹ️ <strong>Immediate Access Restrictions Apply</strong>:<br />
              As a security precaution, you cannot view their files or passwords right now. Access remains locked. You will be notified in the future if a legacy verification condition is met.
            </div>
            <div className="pt-4">
              <Link
                to="/dashboard"
                className="w-full inline-flex justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {!error && !success && preview && (
          <div className="mt-6 space-y-6">
            {/* Invitation Pitch Card */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 text-center">
              <p className="text-sm text-slate-650 leading-relaxed">
                <strong>{preview.inviterName}</strong> has invited you to become a **Trusted Person** for their Digital Legacy.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3.5 text-xs text-slate-500 font-semibold">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Your Relationship</span>
                  <span className="font-bold text-slate-850 text-xs mt-0.5 inline-block">{preview.relationship}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Designated Role</span>
                  <span className="font-bold text-slate-850 text-xs mt-0.5 inline-block">{preview.role.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-[11px] leading-relaxed text-indigo-750 font-semibold">
              🔒 <strong>Security Warning</strong>: Accepting this designation does not give you immediate access to their files, notes, or vault contents. Access permissions remain inactive.
            </div>

            {/* Conditional Authentication flows */}
            {!isAuthenticated ? (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center font-medium leading-relaxed">
                  To accept this designation, please Sign In or Create an Account. We will verify your email address.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={loginRedirectUrl}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white text-slate-700 font-bold text-sm border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to={registerRedirectUrl}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 text-center"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : (
              /* Authenticated accepts email verification match checks */
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {currentUser.email.toLowerCase().trim() !== preview.email.toLowerCase().trim() ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 leading-relaxed">
                    <p className="font-bold">Email Address Mismatch</p>
                    <p className="mt-1 font-medium">
                      This invitation was sent to <span className="font-bold">{preview.email}</span>. However, you are currently logged in as <span className="font-bold">{currentUser.email}</span>.
                    </p>
                    <p className="mt-2 text-[10px] text-red-500 font-bold uppercase">Please sign out and sign in with the correct email account to accept.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium">
                      You are signed in as **{currentUser.email}**. Click accept to link this legacy designation to your account.
                    </p>
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50"
                    >
                      {accepting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Accept Invitation'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
