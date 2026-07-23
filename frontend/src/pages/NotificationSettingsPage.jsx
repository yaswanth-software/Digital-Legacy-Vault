import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    securityAlerts: true,
    emergencyAccessAlerts: true,
    continuityReminders: true,
    releaseExpirationAlerts: true,
    trustedPersonUpdates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api.get('/notifications/settings');
        if (res.data.success) setPrefs(res.data.data.preferences);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggle = (key) => {
    if (key === 'securityAlerts') return; // Cannot disable!
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/notifications/settings', prefs);
      if (res.data.success) {
        showToast('Notification preferences saved.');
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <span>🔔</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Notification Settings</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Customize which notification channels and alert categories you wish to receive.
        </p>
      </div>

      {/* Security Alert Guarantee Banner */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl p-5 text-xs font-semibold flex items-start gap-3">
        <span className="text-lg">🛡️</span>
        <div>
          <span className="font-bold block text-sm">Security Transparency Notice</span>
          <p className="mt-0.5 leading-relaxed text-amber-800">
            Critical security alerts (suspicious activity, emergency access filings, account security events) cannot be completely disabled to safeguard vault integrity.
          </p>
        </div>
      </div>

      {/* Settings Form Card */}
      <Card padding="p-6 md:p-8" className="space-y-6">
        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Delivery Channels</h3>

        <div className="space-y-4 divide-y divide-slate-100 text-xs font-semibold">
          <div className="pt-2 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Email Notifications</span>
              <span className="text-[11px] text-slate-500 font-medium">Receive digest summaries and alert warnings via email.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">In-App Notifications</span>
              <span className="text-[11px] text-slate-500 font-medium">Show real-time alerts in the top navigation bell badge.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.inAppNotifications}
              onChange={() => handleToggle('inAppNotifications')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 pt-4">Category Subscriptions</h3>

        <div className="space-y-4 divide-y divide-slate-100 text-xs font-semibold">
          <div className="pt-2 flex items-center justify-between opacity-80">
            <div>
              <span className="block text-slate-800 font-bold flex items-center gap-1.5">
                <span>🛡️ Security Incident Alerts</span>
                <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-extrabold uppercase">Required</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Alerts on unauthorized access attempts and token activity.</span>
            </div>
            <input
              type="checkbox"
              disabled
              checked={true}
              className="w-4 h-4 rounded text-indigo-600 cursor-not-allowed"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Emergency Access Filings</span>
              <span className="text-[11px] text-slate-500 font-medium">High-priority alerts when a trusted contact files an emergency access request.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emergencyAccessAlerts}
              onChange={() => handleToggle('emergencyAccessAlerts')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Continuity Check-In Reminders</span>
              <span className="text-[11px] text-slate-500 font-medium">Reminders when your scheduled check-in is due.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.continuityReminders}
              onChange={() => handleToggle('continuityReminders')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="block text-slate-800 font-bold">Release Expiration Warnings</span>
              <span className="text-[11px] text-slate-500 font-medium">Warnings when active temporary release access is expiring.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.releaseExpirationAlerts}
              onChange={() => handleToggle('releaseExpirationAlerts')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="primary" size="md" onClick={handleSave} loading={saving}>
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
}
