import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  startTime: number;
  running: boolean;
}

export function useTimer({ startTime, running }: UseTimerOptions) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      // Update immediately
      setElapsed(Math.floor((Date.now() - startTime) / 1000));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, running]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsed,
    formatted: formatTime(elapsed),
  };
}
