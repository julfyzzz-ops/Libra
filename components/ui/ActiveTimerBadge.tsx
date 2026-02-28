
import React, { useState, useEffect } from 'react';
import { formatTime } from '../../utils';

interface ActiveTimerBadgeProps {
  bookId: string;
}

export const ActiveTimerBadge: React.FC<ActiveTimerBadgeProps> = ({ bookId }) => {
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const saved = localStorage.getItem(`libra_session_${bookId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.isActive) {
            let currentSecs = parsed.accumulatedTime;
            if (!parsed.isPaused && parsed.startTime) {
              currentSecs += Math.floor((Date.now() - parsed.startTime) / 1000);
            }
            setDisplaySeconds(currentSecs);
            return;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      setDisplaySeconds(null);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    // Listen for storage changes to sync across tabs/components
    window.addEventListener('storage', updateTimer);
    window.addEventListener('libra_session_update', updateTimer as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateTimer);
      window.removeEventListener('libra_session_update', updateTimer as EventListener);
    };
  }, [bookId]);

  if (displaySeconds === null) return null;

  return (
    <div className="absolute top-4 right-6 bg-red-600 text-black text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg z-20 flex items-center justify-center whitespace-nowrap">
      {formatTime(displaySeconds)}
    </div>
  );
};
