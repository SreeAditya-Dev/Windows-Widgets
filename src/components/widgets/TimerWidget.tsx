import React, { useState, useEffect, useRef } from 'react';
import { TimerSettings } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';

// Generates an authentic Apple-style chime sound using the browser Web Audio API
function playChime(volume = 0.8) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.35 * volume), ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Apple 3-note ascending chime: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
    playTone(784, 0, 0.4);
    playTone(1046.5, 0.12, 0.5);
    playTone(1318.5, 0.25, 0.8);

    // Close the audio context once playback finishes to prevent leaking audio connections
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (e) {
    console.warn('[Timer] WebAudio chime error:', e);
  }
}

export const TimerWidget: React.FC<WidgetProps<TimerSettings>> = ({ size, settings }) => {
  const initialSeconds = settings?.defaultDurationSeconds || 300; // 5 min default
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Synchronize when "Default duration" changes in Settings while idle
  useEffect(() => {
    const dur = settings?.defaultDurationSeconds || 300;
    if (!isRunning && !isFinished) {
      setTotalSeconds(dur);
      setRemainingSeconds(dur);
    }
  }, [settings?.defaultDurationSeconds, isRunning, isFinished]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            if (settings?.soundEnabled !== false) playChime(settings?.soundVolume ?? 0.8);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const toggleStartPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFinished) {
      setRemainingSeconds(totalSeconds);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
    setIsFinished(false);
    setRemainingSeconds(totalSeconds);
  };

  const selectPreset = (seconds: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
    setIsFinished(false);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // SVG Circular Gauge Calculations
  const radius = size === 'small' ? 42 : 60;
  const stroke = 5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const header = (
    <div className="w-full flex items-center justify-between text-[11px] font-bold tracking-wide text-apple-orange uppercase">
      <span className="flex items-center gap-1">
        <Bell size={12} className={isRunning ? 'animate-bounce' : ''} />
        <span>Timer</span>
      </span>
      <span className="text-ink/40 normal-case font-medium text-[10px]">
        {isFinished ? 'Finished' : isRunning ? 'Running' : 'Paused'}
      </span>
    </div>
  );

  const gauge = (
    <div className="relative flex items-center justify-center flex-shrink-0">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle stroke="rgb(var(--ink) / 0.12)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={isFinished ? '#34C759' : '#FF9500'}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s linear' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-medium tnum tracking-tight ${size === 'small' ? 'text-[20px]' : 'text-[28px]'} ${isFinished ? 'text-apple-green animate-pulse' : ''}`}>
          {formatTime(remainingSeconds)}
        </span>
      </div>
    </div>
  );

  const controls = (
    <div className="flex items-center gap-2.5 no-drag">
      <button
        onClick={handleReset}
        title="Reset timer"
        className="w-8 h-8 rounded-full bg-ink/10 hover:bg-ink/20 active:scale-95 transition-all flex items-center justify-center text-ink/70 hover:text-ink"
      >
        <RotateCcw size={13} />
      </button>
      <button
        onClick={toggleStartPause}
        title={isRunning ? 'Pause' : 'Start'}
        className={`h-8 px-4 rounded-full flex items-center gap-1.5 font-semibold text-[12px] active:scale-95 transition-all ${
          isRunning ? 'bg-apple-orange/20 text-apple-orange hover:bg-apple-orange/30' : 'bg-apple-orange text-white hover:brightness-110'
        }`}
      >
        {isRunning ? <Pause size={13} /> : <Play size={13} />}
        <span>{isRunning ? 'Pause' : remainingSeconds === 0 ? 'Restart' : 'Start'}</span>
      </button>
    </div>
  );

  if (size === 'small') {
    return (
      <div className="w-full h-full px-3.5 py-3 flex flex-col items-center justify-between">
        {header}
        {gauge}
        {controls}
      </div>
    );
  }

  return (
    <div className="w-full h-full px-4 py-3.5 flex flex-col">
      {header}
      <div className="flex-1 flex items-center gap-4">
        {gauge}
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="grid grid-cols-2 gap-1.5 no-drag">
            {[
              { label: '1 min', sec: 60 },
              { label: '5 min', sec: 300 },
              { label: '15 min', sec: 900 },
              { label: '25 min', sec: 1500 }
            ].map(p => (
              <button
                key={p.sec}
                onClick={e => selectPreset(p.sec, e)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  totalSeconds === p.sec ? 'bg-apple-orange text-white' : 'bg-ink/10 hover:bg-ink/20 text-ink/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {controls}
        </div>
      </div>
    </div>
  );
};
