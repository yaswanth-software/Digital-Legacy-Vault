import React from 'react';

export default function SkeletonLoader({ count = 3, height = 'h-20', className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`bg-slate-200/70 rounded-2xl w-full ${height}`} />
      ))}
    </div>
  );
}
