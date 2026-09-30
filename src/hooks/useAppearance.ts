import { useEffect, useState } from 'react';
import { useWidgetStore } from './useWidgetStore';

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Resolves 'auto' against the Windows light/dark setting. */
export function useResolvedScheme(): 'dark' | 'light' {
  const theme = useWidgetStore(s => s.settings.theme);
  const [systemDark, setSystemDark] = useState(() => mq().matches);

  useEffect(() => {
    const m = mq();
    const onChange = () => setSystemDark(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  if (theme === 'auto') return systemDark ? 'dark' : 'light';
  return theme;
}

export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** CSS variables applied at the root of a window (accent + radius). */
export function useRootVars(): React.CSSProperties {
  const accent = useWidgetStore(s => s.settings.accent);
  const radius = useWidgetStore(s => s.settings.radius);
  return {
    ['--accent-rgb' as any]: hexToRgbTriplet(accent || '#007AFF'),
    ['--radius' as any]: `${radius ?? 22}px`
  };
}
