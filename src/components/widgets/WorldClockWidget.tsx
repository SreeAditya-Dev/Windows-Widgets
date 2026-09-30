import React from 'react';
import { WorldClockSettings } from '../../types/widget';
import { WidgetProps, useNow, zonedTime, formatHM, ampm } from '../../widgets/shared';
import { ClockFace } from './AnalogClockWidget';

const offsetLabel = (h: number) => {
  if (h === 0) return 'Today';
  const abs = Math.abs(h);
  const txt = Number.isInteger(abs) ? `${abs}` : abs.toFixed(1);
  return `${h > 0 ? '+' : '−'}${txt}HRS`;
};

export const WorldClockWidget: React.FC<WidgetProps<WorldClockSettings>> = ({ size, settings }) => {
  const now = useNow(1000);
  const zones = (settings.zones || []).slice(0, 4);

  if (zones.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-[12px] text-ink/50">Add cities in Settings</div>;
  }

  if (size === 'medium') {
    return (
      <div className="w-full h-full flex items-center justify-around px-3">
        {zones.map(z => {
          const t = zonedTime(now, z.timeZone);
          const night = t.h < 6 || t.h >= 18;
          return (
            <div key={z.timeZone + z.label} className="flex flex-col items-center gap-1.5 w-[78px]">
              <ClockFace h={t.h} m={t.m} s={t.s} night={night} size={70} />
              <div className="text-[12px] font-semibold truncate max-w-full">{z.label}</div>
              <div className="text-[10px] text-ink/50 -mt-1.5 tnum">{offsetLabel(t.offsetHours)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col px-4 py-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink/50 mb-1">World Clock</div>
      <div className="flex-1 flex flex-col justify-around">
        {zones.map((z, i) => {
          const t = zonedTime(now, z.timeZone);
          const night = t.h < 6 || t.h >= 18;
          return (
            <div
              key={z.timeZone + z.label}
              className={`flex items-center gap-3 py-2 ${i < zones.length - 1 ? 'border-b border-ink/10' : ''}`}
            >
              <ClockFace h={t.h} m={t.m} s={t.s} night={night} size={46} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate">{z.label}</div>
                <div className="text-[11px] text-ink/50 tnum">
                  {t.weekday}, {offsetLabel(t.offsetHours)}
                </div>
              </div>
              <div className="text-[26px] font-light tnum tracking-tight">
                {formatHM(t, settings.use24h)}
                {!settings.use24h && <span className="text-[12px] font-medium text-ink/50 ml-1">{ampm(t.h)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
