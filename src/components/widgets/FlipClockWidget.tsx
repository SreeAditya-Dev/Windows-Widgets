import React from 'react';
import { ClockSettings } from '../../types/widget';
import { WidgetProps, useNow, zonedTime, pad2, ampm } from '../../widgets/shared';

const FlipPair: React.FC<{ value: string; w: number; h: number; font: number }> = ({ value, w, h, font }) => (
  <div className="flex gap-[3px]">
    {value.split('').map((d, i) => (
      <div key={i} className="flip-card tnum" style={{ width: w, height: h, fontSize: font }}>
        <span key={d} className="flip-digit leading-none">
          {d}
        </span>
      </div>
    ))}
  </div>
);

export const FlipClockWidget: React.FC<WidgetProps<ClockSettings>> = ({ size, settings }) => {
  const now = useNow(1000);
  const t = zonedTime(now, settings.timeZone);
  const showSeconds = settings.showSeconds !== false;
  const hours = settings.use24h ? t.h : t.h % 12 === 0 ? 12 : t.h % 12;
  const large = size === 'large';

  const cardW = large ? (showSeconds ? 46 : 64) : showSeconds ? 44 : 60;
  const cardH = large ? (showSeconds ? 74 : 100) : showSeconds ? 70 : 92;
  const font = large ? (showSeconds ? 54 : 74) : showSeconds ? 50 : 68;

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: settings.timeZone
  });

  const colon = <div className="text-[28px] font-bold text-ink/40 pb-1">:</div>;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
      {large && <div className="text-[17px] font-semibold text-ink/80">{dateLabel}</div>}
      <div className="flex items-center gap-1.5">
        <FlipPair value={pad2(hours)} w={cardW} h={cardH} font={font} />
        {colon}
        <FlipPair value={pad2(t.m)} w={cardW} h={cardH} font={font} />
        {showSeconds && (
          <>
            {colon}
            <FlipPair value={pad2(t.s)} w={cardW} h={cardH} font={font} />
          </>
        )}
      </div>
      {large ? (
        <div className="text-[13px] font-medium text-ink/50 uppercase tracking-widest">
          {settings.use24h ? '24-hour' : ampm(t.h)}
        </div>
      ) : (
        !settings.use24h && <div className="text-[11px] font-semibold text-ink/50 -mt-1">{ampm(t.h)}</div>
      )}
    </div>
  );
};
