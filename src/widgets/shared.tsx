import React, { useEffect, useState } from 'react';
import { WidgetSize, PhotosSettings } from '../types/widget';

export interface WidgetProps<S = Record<string, any>> {
  id: string;
  size: WidgetSize;
  settings: S;
  onSettings: (patch: Partial<S>) => void;
  preview?: boolean;
}

/**
 * Opens the photo picker and returns the Photos settings to apply, or null if the
 * user cancelled (or a folder had no images, so the current photos are kept).
 */
export async function choosePhotos(kind: 'folder' | 'photo'): Promise<Partial<PhotosSettings> | null> {
  const pick = await window.electronAPI?.openPhotoDialog(kind);
  if (!pick || pick.images.length === 0) return null;
  return { customImages: pick.images, source: pick.kind, sourceLabel: pick.label };
}

/** Re-render every `ms` milliseconds, aligned to the wall clock. */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, ms - (Date.now() % ms));
    };
    timer = setTimeout(tick, ms - (Date.now() % ms));
    return () => clearTimeout(timer);
  }, [ms]);
  return now;
}

export interface ZonedTime {
  h: number;
  m: number;
  s: number;
  weekday: string;
  day: number;
  month: string;
  /** offset from local in hours, e.g. -9.5 */
  offsetHours: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz?: string) => {
  const key = tz || 'local';
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    fmtCache.set(key, f);
  }
  return f;
};

export function zonedTime(date: Date, timeZone?: string): ZonedTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = fmt(timeZone).formatToParts(date);
  } catch {
    parts = fmt().formatToParts(date);
  }
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  const h = parseInt(get('hour'), 10) % 24;
  const m = parseInt(get('minute'), 10);
  const s = parseInt(get('second'), 10);
  const zonedAsLocal = new Date(
    parseInt(get('year'), 10),
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(get('month')),
    parseInt(get('day'), 10),
    h,
    m,
    s
  );
  const offsetHours = Math.round(((zonedAsLocal.getTime() - date.getTime()) / 3600000) * 2) / 2;
  return { h, m, s, weekday: get('weekday'), day: parseInt(get('day'), 10), month: get('month'), offsetHours };
}

export const pad2 = (n: number) => n.toString().padStart(2, '0');

export function formatHM(t: { h: number; m: number }, use24h?: boolean) {
  if (use24h) return `${pad2(t.h)}:${pad2(t.m)}`;
  const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
  return `${h12}:${pad2(t.m)}`;
}

export const ampm = (h: number) => (h < 12 ? 'AM' : 'PM');

export function formatBytes(bytes: number, digits = 1) {
  if (!bytes) return '0 GB';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1000) return `${(gb / 1024).toFixed(digits)} TB`;
  return `${gb.toFixed(gb >= 100 ? 0 : digits)} GB`;
}

interface RingProps {
  value: number; // 0-1
  size: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: React.ReactNode;
}

/** macOS Batteries-style progress ring */
export const Ring: React.FC<RingProps> = ({ value, size, stroke = 6, color, track, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={track || 'rgb(var(--ink) / 0.12)'} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          style={{ strokeDashoffset: c * (1 - v), transition: 'stroke-dashoffset 0.8s cubic-bezier(0.3,0.8,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/** Colour used by macOS for gauges: green → yellow → red as load increases */
export const loadColor = (v: number) => (v < 0.6 ? '#34C759' : v < 0.85 ? '#FF9F0A' : '#FF3B30');

export const WidgetTitle: React.FC<{ icon?: React.ReactNode; color?: string; children: React.ReactNode; right?: React.ReactNode }> = ({
  icon,
  color,
  children,
  right
}) => (
  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
    <span className="flex items-center gap-1">
      {icon}
      <span>{children}</span>
    </span>
    {right}
  </div>
);
