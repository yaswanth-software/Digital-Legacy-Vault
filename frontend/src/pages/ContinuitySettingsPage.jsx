import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSettings, updateSettings } from '../services/continuityService';

const FREQUENCY_OPTIONS = [
  { value: 30, label: '30 Days (Monthly)' },
  { value: 60, label: '60 Days (Bi-monthly)' },
  { value: 90, label: '90 Days (Quarterly)' },
  { value: 180, label: '180 Days (Half-Yearly)' },
  { value: 365, label: '365 Days (Annually)' },
];

const GRACE_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
];

export default function ContinuitySettingsPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    checkInFrequencyDays: 90,
    gracePeriodDays: 14,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await getSettings();
        if (res.success && res.data.settings) {
          const s = res.data.settings;
          setFormData({
            checkInFrequencyDays: s.checkInFrequencyDays,
            gracePeriodDays: s.gracePeriodDays,
          });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await updateSettings(formData);
      if (res.success) {
        navigate('/continuity');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update check-in settings.');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/continuity" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Continuity Dashboard
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Continuity Configurations</h1>
        <p className="mt-1 text-slate-500 text-sm">Define how frequently you will check in and configure verification grace periods.</p>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Frequency Select */}
          <div>
            <label htmlFor="checkInFrequencyDays" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Check-in Frequency *</label>
            <select
              id="checkInFrequencyDays"
              name="checkInFrequencyDays"
              value={formData.checkInFrequencyDays}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-slate-700"
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
              You will be requested to complete a manual activity confirmation within this recurring cycle.
            </p>
          </div>

          {/* Grace Period Select */}
          <div>
            <label htmlFor="gracePeriodDays" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Overdue Grace Period *</label>
            <select
              id="gracePeriodDays"
              name="gracePeriodDays"
              value={formData.gracePeriodDays}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-slate-700"
            >
              {GRACE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
              Additional safety buffer duration added after your check-in deadline. Requests to trusted people are blocked during grace periods.
            </p>
          </div>

          {/* Visual Informational Preview panel */}
          <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 text-indigo-850">
            <h4 className="font-extrabold text-sm text-indigo-900 mb-2">⚙️ Timeline Preview</h4>
            <div className="text-xs space-y-2 leading-relaxed font-semibold">
              <p>
                • You will check in every <span className="text-indigo-650 underline font-extrabold">{formData.checkInFrequencyDays} days</span>.
              </p>
              <p>
                • If you miss a deadline, you will receive reminders and enter a <span className="text-indigo-650 underline font-extrabold">{formData.gracePeriodDays}-day grace period</span>.
              </p>
              <p>
                • Trusted person confirmation triggers are **completely blocked** until day <span className="font-extrabold text-indigo-700">{formData.checkInFrequencyDays + formData.gracePeriodDays}</span>.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/continuity"
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors bg-white shadow-sm text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
