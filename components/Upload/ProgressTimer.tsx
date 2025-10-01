'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ProgressTimerProps {
  isActive: boolean;
  onReset?: () => void;
}

export function ProgressTimer({ isActive, onReset }: ProgressTimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (onReset && !isActive) {
      setSeconds(0);
    }
  }, [isActive, onReset]);

  if (!isActive && seconds === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{seconds}s decorridos</span>
      {seconds > 20 && (
        <span className="text-xs text-gray-500">
          (PDFs grandes podem levar 30-60s)
        </span>
      )}
    </div>
  );
}
