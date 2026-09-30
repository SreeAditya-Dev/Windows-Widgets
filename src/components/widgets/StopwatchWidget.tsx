import React, { useEffect, useRef, useState } from 'react';
import { WidgetProps, pad2 } from '../../widgets/shared';

const format = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
};

export const StopwatchWidget: React.FC<WidgetProps> = ({ size }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startedAt = useRef(0);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      // ~30fps is plenty and keeps CPU low
      if (t - last > 33) {
        setElapsed(base.current + (performance.now() - startedAt.current));
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const toggle = () => {
    if (running) {
      base.current += performance.now() - startedAt.current;
      setElapsed(base.current);
      setRunning(false);
    } else {
      startedAt.current = performance.now();
      setRunning(true);
    }
  };

  const lapOrReset = () => {
    if (running) setLaps(l => [elapsed, ...l]);
    else {
      base.current = 0;
      setElapsed(0);
      setLaps([]);
    }
  };

  const Buttons = (
    <div className="flex items-center justify-between w-full no-drag">
      <button
        onClick={lapOrReset}
        disabled={!running && elapsed === 0}
        className="w-[52px] h-[52px] rounded-full bg-ink/15 hover:bg-ink/20 text-[13px] font-medium disabled:opacity-40 transition-colors"
      >
        {running || elapsed === 0 ? 'Lap' : 'Reset'}
      </button>
      <button
        onClick={toggle}
        className={`w-[52px] h-[52px] rounded-full text-[13px] font-medium transition-colors ${
          running ? 'bg-[#FF453A]/25 text-[#FF453A] hover:bg-[#FF453A]/35' : 'bg-[#30D158]/25 text-[#30D158] hover:bg-[#30D158]/35'
        }`}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </div>
  );

  if (size === 'small') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between p-3.5">
        <div className="self-start text-[11px] font-bold uppercase tracking-wide text-[#FF9F0A]">Stopwatch</div>
        <div className="text-[30px] font-light tnum tracking-tight">{format(elapsed)}</div>
        {Buttons}
      </div>
    );
  }

  const lapTimes = laps.map((l, i) => l - (laps[i + 1] ?? 0));
  const best = lapTimes.length > 1 ? Math.min(...lapTimes) : -1;
  const worst = lapTimes.length > 1 ? Math.max(...lapTimes) : -1;

  return (
    <div className="w-full h-full flex items-center gap-4 px-4 py-3.5">
      <div className="w-[160px] flex flex-col items-center justify-between h-full">
        <div className="self-start text-[11px] font-bold uppercase tracking-wide text-[#FF9F0A]">Stopwatch</div>
        <div className="text-[32px] font-light tnum tracking-tight">{format(elapsed)}</div>
        {Buttons}
      </div>
      <div className="flex-1 h-full overflow-y-auto no-scrollbar border-l border-ink/10 pl-3">
        {laps.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-ink/40">No laps</div>
        ) : (
          lapTimes.map((t, i) => (
            <div
              key={i}
              className={`flex justify-between text-[12px] py-1 border-b border-ink/10 tnum ${
                t === best ? 'text-[#30D158]' : t === worst ? 'text-[#FF453A]' : ''
              }`}
            >
              <span>Lap {laps.length - i}</span>
              <span>{format(t)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
