import React from 'react';
import { ClockSettings } from '../../types/widget';
import { WidgetProps, useNow, zonedTime, formatHM, ampm } from '../../widgets/shared';

export const ClockFace: React.FC<{ h: number; m: number; s: number; showSeconds?: boolean; night?: boolean; size: number }> = ({
  h,
  m,
  s,
  showSeconds = true,
  night,
  size
}) => {
  const hourDeg = (h % 12) * 30 + m * 0.5;
  const minDeg = m * 6 + s * 0.1;
  const secDeg = s * 6;
  const face = night ? '#1c1c1e' : '#ffffff';
  const ink = night ? '#f5f5f7' : '#1d1d1f';
  const sub = night ? 'rgba(245,245,247,0.45)' : 'rgba(29,29,31,0.45)';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
      <circle cx="50" cy="50" r="49" fill={face} />
      {Array.from({ length: 60 }).map((_, i) => {
        const major = i % 5 === 0;
        // Tiny faces (world clock) only show the numbers, like macOS
        if (size < 90) return null;
        return (
          <line
            key={i}
            x1="50"
            y1={major ? 5 : 5.5}
            x2="50"
            y2={major ? 10 : 7.5}
            stroke={major ? ink : sub}
            strokeWidth={major ? 1.4 : 0.6}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 50 50)`}
          />
        );
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        return (
          <text
            key={n}
            x={50 + Math.sin(a) * 34}
            y={50 - Math.cos(a) * 34 + 4.2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={ink}
            style={{ fontFamily: 'inherit' }}
          >
            {n}
          </text>
        );
      })}
      {/* hour */}
      <line x1="50" y1="50" x2="50" y2="27" stroke={ink} strokeWidth="4" strokeLinecap="round" transform={`rotate(${hourDeg} 50 50)`} />
      {/* minute */}
      <line x1="50" y1="50" x2="50" y2="13" stroke={ink} strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
      <circle cx="50" cy="50" r="3.2" fill={ink} />
      {showSeconds && (
        <g transform={`rotate(${secDeg} 50 50)`} style={{ transition: s === 0 ? 'none' : 'transform 0.25s cubic-bezier(0.4,2.2,0.5,1)' }}>
          <line x1="50" y1="60" x2="50" y2="10" stroke="#FF9500" strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2" fill="#FF9500" />
          <circle cx="50" cy="50" r="0.9" fill={face} />
        </g>
      )}
    </svg>
  );
};

export const AnalogClockWidget: React.FC<WidgetProps<ClockSettings>> = ({ size, settings }) => {
  const now = useNow(1000);
  const t = zonedTime(now, settings.timeZone);
  const night = t.h < 6 || t.h >= 18;
  const showSeconds = settings.showSeconds !== false;
  const label = settings.label || (settings.timeZone ? settings.timeZone.split('/').pop()!.replace(/_/g, ' ') : 'Local');

  if (size === 'small') {
    return (
      <div className="w-full h-full flex items-center justify-center p-3">
        <ClockFace h={t.h} m={t.m} s={t.s} showSeconds={showSeconds} night={night} size={144} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center gap-5 px-5">
      <ClockFace h={t.h} m={t.m} s={t.s} showSeconds={showSeconds} night={night} size={136} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink/60 uppercase tracking-wide truncate">{label}</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[44px] font-semibold leading-none tnum tracking-tight">{formatHM(t, settings.use24h)}</span>
          {!settings.use24h && <span className="text-[15px] font-semibold text-ink/60">{ampm(t.h)}</span>}
        </div>
        <div className="text-[13px] text-ink/60 mt-2">
          {t.weekday}, {t.day} {t.month}
        </div>
      </div>
    </div>
  );
};
