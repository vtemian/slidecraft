import { useTimer } from './useTimer';
import './Timer.css';

interface TimerProps {
  startTime: number;
  running: boolean;
  finalTime?: number;
}

export function Timer({ startTime, running, finalTime }: TimerProps) {
  const { formatted } = useTimer({ startTime, running });

  // If we have a final time, display that instead
  const displayTime = finalTime !== undefined
    ? formatSeconds(finalTime)
    : formatted;

  return (
    <div className={`timer ${!running ? 'timer--stopped' : ''}`}>
      {displayTime}
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
