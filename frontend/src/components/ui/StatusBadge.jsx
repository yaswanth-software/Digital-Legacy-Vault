import React from 'react';

const STATUS_PRESETS = {
  active: { label: 'Active', icon: '🟢', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  healthy: { label: 'Healthy', icon: '💚', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', icon: '⏳', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  due_soon: { label: 'Due Soon', icon: '⏰', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  verified: { label: 'Verified', icon: '✓', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  eligible: { label: 'Eligible', icon: '🚀', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  expired: { label: 'Expired', icon: '🛑', badge: 'bg-red-50 text-red-700 border-red-200' },
  revoked: { label: 'Revoked', icon: '🚫', badge: 'bg-red-50 text-red-700 border-red-200' },
  blocked: { label: 'Blocked', icon: '⛔', badge: 'bg-red-50 text-red-700 border-red-200' },
  paused: { label: 'Paused', icon: '⏸️', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  needs_attention: { label: 'Needs Attention', icon: '⚠️', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  at_risk: { label: 'At Risk', icon: '🔴', badge: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },
};

export default function StatusBadge({ status, customLabel, className = '' }) {
  const normalized = (status || 'active').toLowerCase().replace(/[\s-]/g, '_');
  const preset = STATUS_PRESETS[normalized] || {
    label: customLabel || status,
    icon: '•',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${preset.badge} ${className}`}>
      <span>{preset.icon}</span>
      <span>{customLabel || preset.label}</span>
    </span>
  );
}
