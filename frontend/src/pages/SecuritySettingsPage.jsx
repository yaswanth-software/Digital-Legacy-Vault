import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function SecuritySettingsPage() {
  const { currentUser } = useAuth();
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Security notification preferences state
  const [prefs, setPrefs] = useState({
    securityAlerts: true,
    emergencyNotifications: true,
    releaseNotifications: true,
    checkInReminders: true,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetSent(true);
      showToast('Password reset link sent to your registered email.');
    } catch (err) {
      alert('Failed to send password reset email: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    showToast('Security notification preference updated.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <span>⚙️</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Security Settings</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Manage your account authentication credentials, notification channels, and security alerts.
        </p>
      </div>

      {/* Account Security Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Account Security</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Account Email</span>
            <span className="text-slate-800 text-sm font-bold">{currentUser?.email}</span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Email Verification Status</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded border ${
              currentUser?.emailVerified
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {currentUser?.emailVerified ? '✓ Verified' : '⚠️ Pending Verification'}
            </span>
          </div>
        </div>

        {/* Change Password Panel */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Password Management</h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Request a secure Firebase Authentication password reset email.
            </p>
          </div>

          <button
            disabled={resetLoading || resetSent}
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
          >
            {resetSent ? '✓ Reset Link Sent' : resetLoading ? 'Sending...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Multi-Factor Authentication (MFA) Info Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Multi-Factor Authentication (MFA)</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Multi-factor authentication adds an extra layer of security to your account during login.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
            Firebase Auth Standard
          </span>
        </div>
        <p className="text-xs text-slate-600 font-semibold leading-relaxed bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
          💡 Multi-factor authentication can be managed through your primary Firebase Authentication provider configuration.
        </p>
      </div>

      {/* Security Notification Preferences */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Security & Emergency Alerts</h3>
        
        <div className="space-y-3 divide-y divide-slate-100 text-xs font-semibold">
          <div className="pt-2 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Security Incident Alerts</span>
              <span className="text-[11px] text-slate-500 font-medium">Receive notifications when suspicious access attempts are detected.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.securityAlerts}
              onChange={() => togglePref('securityAlerts')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Emergency Access Notifications</span>
              <span className="text-[11px] text-slate-500 font-medium">Receive high-priority alerts when a trusted contact files an emergency access request.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emergencyNotifications}
              onChange={() => togglePref('emergencyNotifications')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Controlled Release Tokens</span>
              <span className="text-[11px] text-slate-500 font-medium">Receive alerts when legacy release tokens are issued or accessed.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.releaseNotifications}
              onChange={() => togglePref('releaseNotifications')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
