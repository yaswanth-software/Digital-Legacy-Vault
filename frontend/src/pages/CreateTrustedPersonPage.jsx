import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTrustedPerson } from '../services/trustedPeopleService';

const RELATIONSHIP_OPTIONS = [
  { value: 'family', label: 'Family Member' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'relative', label: 'Relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'financial_advisor', label: 'Financial Advisor' },
  { value: 'executor', label: 'Executor' },
  { value: 'other', label: 'Other (specify...)' },
];

const ROLE_OPTIONS = [
  { value: 'legacy_recipient', label: 'Legacy Recipient (Receives specific assets)' },
  { value: 'legacy_executor', label: 'Legacy Executor (Coordinates overall release)' },
  { value: 'legal_advisor', label: 'Legal Advisor (Handles legal inheritance info)' },
  { value: 'financial_advisor', label: 'Financial Advisor (Handles bank/financial info)' },
  { value: 'emergency_contact', label: 'Emergency Contact (Initiates wellness check-in)' },
  { value: 'family_member', label: 'Family Member (General trusted access)' },
  { value: 'other', label: 'Other Role' },
];

export default function CreateTrustedPersonPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    relationship: 'family',
    customRelationship: '',
    role: 'legacy_recipient',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devInviteUrl, setDevInviteUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDevInviteUrl('');

    // Validations
    if (formData.fullName.trim().length < 2) {
      setError('Full Name must be at least 2 characters.');
      return;
    }

    if (formData.email.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()) {
      setError('You cannot designate yourself as a trusted person.');
      return;
    }

    setLoading(true);
    try {
      const res = await createTrustedPerson(formData);
      if (res.success) {
        const tp = res.data.trustedPerson;
        if (tp._devInvitationUrl) {
          // In development mode, capture the token URL and display it
          setDevInviteUrl(tp._devInvitationUrl);
          setLoading(false);
        } else {
          // Redirect immediately in production environments
          navigate('/trusted-people', { state: { info: `${formData.fullName} added successfully!` } });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add trusted person. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Link to="/trusted-people" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Trusted People
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Designate Trusted Person</h1>
        <p className="mt-1 text-slate-500 text-sm">Add someone you trust and invite them to accept your designation.</p>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Development Mode Invite Token Panel */}
        {devInviteUrl && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800">
            <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-sm">
              <span>🛠️ Local Development Mode</span>
            </div>
            <p className="text-xs leading-relaxed mb-4">
              Since local servers don't send emails automatically, copy the invitation link below to accept it on behalf of the trusted person:
            </p>
            <textarea
              readOnly
              value={devInviteUrl}
              className="w-full text-xs font-mono bg-white border border-amber-250 p-3 rounded-xl resize-none text-slate-700 focus:outline-none mb-4"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(devInviteUrl);
                  alert('Dev link copied to clipboard!');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                Copy Link
              </button>
              <Link
                to="/trusted-people"
                className="px-4 py-2 border border-amber-250 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl transition-colors"
              >
                Done / Back to List
              </Link>
            </div>
          </div>
        )}

        {!devInviteUrl && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Sarah Connor"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. sarah.connor@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +1 (555) 019-2834"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Grid for Relationship and Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Relationship */}
              <div>
                <label htmlFor="relationship" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Relationship *</label>
                <select
                  id="relationship"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Designated Role */}
              <div>
                <label htmlFor="role" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Designated Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Relationship details */}
            {formData.relationship === 'other' && (
              <div className="animate-fade-in">
                <label htmlFor="customRelationship" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Relationship Label *</label>
                <input
                  type="text"
                  id="customRelationship"
                  name="customRelationship"
                  required={formData.relationship === 'other'}
                  value={formData.customRelationship}
                  onChange={handleChange}
                  placeholder="e.g. Business Partner, Mentor"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Safety Banner */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 leading-relaxed font-semibold">
              ℹ️ Sending an invitation does NOT grant immediate access to your assets. A secure permission model holds your data private until a designated verification event occurs.
            </div>

            {/* Form actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/trusted-people"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
