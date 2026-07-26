import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getTrustedPeople,
  resendInvitation,
  revokeTrustedPerson,
  deleteTrustedPerson
} from '../services/trustedPeopleService';

// Human-friendly lookup mappings
const RELATIONSHIPS = {
  family: 'Family',
  spouse: 'Spouse',
  parent: 'Parent',
  child: 'Child',
  sibling: 'Sibling',
  relative: 'Relative',
  friend: 'Friend',
  partner: 'Partner',
  lawyer: 'Lawyer',
  financial_advisor: 'Financial Advisor',
  executor: 'Executor',
  other: 'Other'
};

const ROLES = {
  legacy_recipient: 'Legacy Recipient',
  legacy_executor: 'Legacy Executor',
  legal_advisor: 'Legal Advisor',
  financial_advisor: 'Financial Advisor',
  emergency_contact: 'Emergency Contact',
  family_member: 'Family Member',
  other: 'Other'
};

const TRUST_STATUS = {
  active: { label: 'Active Relationship', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive/Paused', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  revoked: { label: 'Revoked', badge: 'bg-red-50 text-red-700 border-red-200' }
};

const INVITATION_STATUS = {
  pending: { label: 'Pending Accept', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Invite Accepted', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  declined: { label: 'Invite Declined', badge: 'bg-red-50 text-red-600 border-red-100' },
  expired: { label: 'Invite Expired', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  revoked: { label: 'Invite Revoked', badge: 'bg-red-50 text-red-600 border-red-100' }
};

export default function TrustedPeoplePage() {
  const navigate = useNavigate();
  const [trustedPeople, setTrustedPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  async function fetchPeople() {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrustedPeople();
      if (res.success) {
        setTrustedPeople(res.data.trustedPeople);
      }
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Unable to connect to backend service. Please check network connection or backend server status.');
      } else {
        setError(err.response?.data?.message || 'Failed to retrieve trusted people list.');
      }
    } finally {
      setLoading(false);
    }

  }

  useEffect(() => {
    fetchPeople();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleResend = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Send a new invitation? This will invalidate the previous invitation link.')) return;
    try {
      setResendingId(id);
      const res = await resendInvitation(id);
      if (res.success) {
        showNotification('Invitation email resent successfully.');
        if (res.data._devInvitationUrl) {
          // If in development mode, output the URL to console and notify
          console.log('DEV ONLY INVITE LINK:', res.data._devInvitationUrl);
          alert(`[DEV MODE] Invitation link resent:\n${res.data._devInvitationUrl}`);
        }
        fetchPeople();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to resend invitation.');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to revoke trust for "${name}"? Revoking this relationship will prevent future access and invalidate any pending invitation.`)) return;
    try {
      const res = await revokeTrustedPerson(id);
      if (res.success) {
        showNotification(`Trust for ${name} has been revoked.`);
        fetchPeople();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to revoke trust.');
    }
  };

  const handleRemove = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${name}" from your active list? This will also remove any configured permissions.`)) return;
    try {
      const res = await deleteTrustedPerson(id);
      if (res.success) {
        showNotification(`${name} has been removed.`);
        fetchPeople();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove trusted person.');
    }
  };

  // Compute statistics
  const stats = {
    total: trustedPeople.length,
    active: trustedPeople.filter(tp => tp.status === 'active' && tp.invitationStatus === 'accepted').length,
    pending: trustedPeople.filter(tp => tp.invitationStatus === 'pending' || tp.invitationStatus === 'expired').length,
    revoked: trustedPeople.filter(tp => tp.status === 'revoked').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Trusted People</h1>
          <p className="mt-1 text-slate-500 text-sm md:text-base">Choose who may become part of your digital legacy journey.</p>
        </div>
        <Link
          to="/trusted-people/new"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-indigo-100"
        >
          <svg className="w-4.5 h-4.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Trusted Person
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Designated', val: stats.total, color: 'border-slate-200 bg-white text-slate-800' },
          { label: 'Active Relationships', val: stats.active, color: 'border-emerald-100 bg-emerald-50/20 text-emerald-800' },
          { label: 'Pending/Expired Invites', val: stats.pending, color: 'border-amber-100 bg-amber-50/30 text-amber-800' },
          { label: 'Revoked Connections', val: stats.revoked, color: 'border-red-150 bg-red-50/10 text-red-800' },
        ].map((c) => (
          <div key={c.label} className={`border rounded-2xl p-5 shadow-sm ${c.color}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {loading ? <span className="inline-block w-8 h-8 bg-slate-200 animate-pulse rounded"></span> : c.val}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-5 mb-8 shadow-sm">
          <h4 className="font-bold">Error</h4>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Main content list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-6 h-48 animate-pulse"></div>
          ))}
        </div>
      ) : trustedPeople.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A3.318 3.318 0 0114.128 20c-1.848 0-3.348-1.5-3.348-3.348v-.003c0-1.113.285-2.16.786-3.07M15 19.128v-.109A3.318 3.318 0 0015.872 18c1.848 0 3.348 1.5 3.348 3.348v.003c0 1.113-.285 2.16-.786 3.07M15 19.128v.109M10.742 16.058a9.38 9.38 0 00-2.625.372 9.337 9.337 0 00-4.121-.952 4.125 4.125 0 017.533-2.493M10.742 16.058v-.003c0-1.113.285-2.16.786-3.07M10.742 16.058v.109m-4.5-4.5a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800">Assign your Trusted Recipients & Executors</h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Designate family, friends, or advisors who will inherit or execute your legacy plan in the future.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 mt-5 text-xs text-indigo-700 font-medium max-w-md mx-auto leading-relaxed">
            🛡️ <strong>Safety Guarantee</strong>: Adding someone does NOT give them immediate access to your data. Your vault remains locked until release rules are met.
          </div>
          <Link
            to="/trusted-people/new"
            className="mt-6 inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
          >
            Designate Trusted Person
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustedPeople.map((tp) => {
            const trustObj = TRUST_STATUS[tp.status] || { label: tp.status, badge: 'bg-slate-100' };
            const inviteObj = INVITATION_STATUS[tp.invitationStatus] || { label: tp.invitationStatus, badge: 'bg-slate-100' };
            
            const formattedDate = new Date(tp.createdAt?._seconds ? tp.createdAt._seconds * 1000 : tp.createdAt)
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={tp.id}
                onClick={() => navigate(`/trusted-people/${tp.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Status Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${inviteObj.badge}`}>
                      {inviteObj.label}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${trustObj.badge}`}>
                      {trustObj.label}
                    </span>
                  </div>

                  {/* Identity */}
                  <h3 className="text-base font-bold text-slate-800 truncate" title={tp.fullName}>
                    {tp.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">{tp.email}</p>

                  {/* Relationship & Role */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Relationship</span>
                      <span className="font-semibold text-slate-700">
                        {tp.relationship === 'other' ? tp.customRelationship || 'Other' : RELATIONSHIPS[tp.relationship] || tp.relationship}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Designated Role</span>
                      <span className="font-semibold text-slate-700">
                        {ROLES[tp.role] || tp.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Added {formattedDate}
                  </span>

                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/trusted-people/${tp.id}/access`}
                      className="inline-flex items-center justify-center px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[11px] rounded-lg transition-colors border border-indigo-100"
                    >
                      Configure Access
                    </Link>
                    
                    {/* Resend Invite Option if Pending/Expired */}
                    {(tp.invitationStatus === 'pending' || tp.invitationStatus === 'expired') && tp.status !== 'revoked' && (
                      <button
                        onClick={(e) => handleResend(tp.id, e)}
                        disabled={resendingId === tp.id}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors"
                        title="Resend Invitation"
                      >
                        {resendingId === tp.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-amber-600 rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.563M20.5 8H15v5" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Revoke trust */}
                    {tp.status !== 'revoked' && (
                      <button
                        onClick={(e) => handleRevoke(tp.id, tp.fullName, e)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors"
                        title="Revoke Trust"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}

                    {/* Soft remove */}
                    <button
                      onClick={(e) => handleRemove(tp.id, tp.fullName, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors"
                      title="Remove Person"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
