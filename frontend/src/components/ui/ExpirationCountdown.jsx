import React, { useEffect, useState } from 'react';

export default function ExpirationCountdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function updateCountdown() {
      if (!expiresAt) return;
      const targetDate = expiresAt._seconds ? new Date(expiresAt._seconds * 1000) : new Date(expiresAt);
      const diffMs = targetDate - new Date();

      if (diffMs <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        if (onExpired) onExpired();
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffMs < 24 * 60 * 60 * 1000) {
        setIsExpiringSoon(true);
      } else {
        setIsExpiringSoon(false);
      }

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
        🔴 Expired
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
        isExpiringSoon
          ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
      }`}
    >
      <span>⏱ {timeLeft} remaining</span>
    </span>
  );
}
