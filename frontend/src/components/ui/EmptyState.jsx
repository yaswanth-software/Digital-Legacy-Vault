import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon = '📂',
  title = 'No items found',
  description = 'You have not added any items yet.',
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div className={`bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center shadow-sm space-y-4 ${className}`}>
      <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
