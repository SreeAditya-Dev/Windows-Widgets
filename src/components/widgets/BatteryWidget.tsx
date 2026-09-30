import React, { useEffect, useState } from 'react';
import { WidgetProps, Ring } from '../../widgets/shared';
import { Laptop, Zap, Plug } from 'lucide-react';

interface BatteryState {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  supported: boolean;
}

function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    level: 1,
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    supported: true
  });

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.getBattery) {
      setState(s => ({ ...s, supported: false }));
      return;
    }
    let battery: any;
    const update = () =>
      setState({
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        supported: true
      });
    nav.getBattery().then((b: any) => {
      battery = b;
      update();
      ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev =>
        b.addEventListener(ev, update)
      );
    });
    return () => {
      if (battery) {
        ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev =>
          battery.removeEventListener(ev, update)
        );
      }
    };
  }, []);

  return state;
}

const durationLabel = (secs: number) => {
  if (!isFinite(secs) || secs <= 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const batteryColor = (level: number, charging: boolean) => (charging || level > 0.2 ? '#34C759' : level > 0.1 ? '#FF9F0A' : '#FF3B30');

export const BatteryWidget: React.FC<WidgetProps> = ({ size }) => {
  const b = useBattery();
  const pct = Math.round(b.level * 100);
  const color = batteryColor(b.level, b.charging);
  // Desktop PCs report a permanently "charging" 100 % battery
  const onAC = b.charging && pct === 100 && b.chargingTime === 0;

  const status = b.charging
    ? onAC
      ? 'Power Adapter'
      : durationLabel(b.chargingTime)
      ? `${durationLabel(b.chargingTime)} until full`
      : 'Charging'
    : durationLabel(b.dischargingTime)
    ? `${durationLabel(b.dischargingTime)} remaining`
    : 'On Battery';

  if (size === 'small') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <Ring value={b.level} size={104} stroke={10} color={color}>
          <Laptop size={30} className="text-ink/85" />
        </Ring>
        <div className="flex items-center gap-0.5 text-[20px] font-semibold tnum">
          {b.charging && <Zap size={15} className="fill-current" />}
          {pct}%
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center gap-5 px-6">
      <Ring value={b.level} size={118} stroke={11} color={color}>
        <Laptop size={36} className="text-ink/85" />
      </Ring>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-wide text-ink/50">This PC</div>
        <div className="flex items-center gap-1 text-[40px] font-semibold tnum leading-tight">
          {b.charging && <Zap size={24} className="fill-current" />}
          {pct}%
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-ink/60">
          {b.charging && <Plug size={13} />}
          {b.supported ? status : 'Battery info unavailable'}
        </div>
      </div>
    </div>
  );
};
