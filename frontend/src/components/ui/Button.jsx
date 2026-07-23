import React from 'react';

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
  secondary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
};

const SIZES = {
  xs: 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg',
  sm: 'px-3.5 py-2 text-xs font-bold rounded-xl',
  md: 'px-4.5 py-2.5 text-xs font-bold rounded-xl',
  lg: 'px-6 py-3 text-sm font-extrabold rounded-2xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  loading = false,
  disabled = false,
  icon = null,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
