import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EmailVerificationPage() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { currentUser, refreshUser, resendVerificationEmail, logout } = useAuth();
  const navigate = useNavigate();

  async function handleCheckVerification() {
    setChecking(true);
    setError('');
    setMessage('');
    try {
      await refreshUser();
      // After refresh, check if verified
      if (currentUser?.emailVerified) {
        navigate('/dashboard');
      } else {
        setMessage('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      setError('Unable to check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResendEmail() {
    setResending(true);
    setError('');
    setMessage('');
    try {
      await resendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err) {
      if (err?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Unable to resend verification email. Please try again.');
      }
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            We've sent a verification email to{' '}
            <strong className="text-slate-700">{currentUser?.email || 'your email'}</strong>.
            <br />
            Please click the link in the email to verify your account.
          </p>

          {/* Messages */}
          {message && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-sm text-emerald-600">{message}</p>
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Checking...
                </>
              ) : (
                'I\'ve Verified My Email'
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Help text */}
          <p className="mt-6 text-xs text-slate-400">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}
