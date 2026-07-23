import React from 'react';

export default function Card({ children, className = '', padding = 'p-6', onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-3xl shadow-sm ${padding} ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 transition-all' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
