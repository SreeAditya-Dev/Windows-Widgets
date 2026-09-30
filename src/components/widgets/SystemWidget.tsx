import React, { useEffect, useState } from 'react';
import { WidgetProps, Ring, loadColor, formatBytes } from '../../widgets/shared';
import { SystemStats } from '../../types/ipc';
import { Cpu, MemoryStick, HardDrive } from 'lucide-react';

const DEMO: SystemStats = {
  cpu: 23,
  memUsed: 9.4 * 1024 ** 3,
  memTotal: 16 * 1024 ** 3,
  diskUsed: 310 * 1024 ** 3,
  diskTotal: 512 * 1024 ** 3,
  diskLabel: 'C:',
  uptime: 3600 * 5,
  cpuModel: 'CPU'
};

function useSystemStats(interval = 2000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      setStats(DEMO);
      return;
    }
    let alive = true;
    const load = () => api.getSystemStats().then(s => alive && setStats(s)).catch(() => {});
    load();
    const t = setInterval(load, interval);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [interval]);
  return stats || DEMO;
}

const uptimeLabel = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
};

export const SystemWidget: React.FC<WidgetProps> = ({ size }) => {
  const s = useSystemStats();
  const cpu = s.cpu / 100;
  const mem = s.memTotal ? s.memUsed / s.memTotal : 0;
  const disk = s.diskTotal ? s.diskUsed / s.diskTotal : 0;

  const gauges = [
    { key: 'cpu', label: 'CPU', value: cpu, icon: <Cpu size={14} />, detail: `${Math.round(s.cpu)}%` },
    { key: 'mem', label: 'Memory', value: mem, icon: <MemoryStick size={14} />, detail: formatBytes(s.memUsed) },
    { key: 'disk', label: `Disk ${s.diskLabel}`, value: disk, icon: <HardDrive size={14} />, detail: `${formatBytes(s.diskTotal - s.diskUsed, 0)} free` }
  ];

  if (size === 'small') {
    return (
      <div className="w-full h-full p-3.5 flex flex-col">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50">System</div>
        <div className="flex-1 flex items-center justify-center">
          <Ring value={cpu} size={92} stroke={9} color={loadColor(cpu)}>
            <div className="text-center">
              <div className="text-[22px] font-semibold tnum leading-none">{Math.round(s.cpu)}%</div>
              <div className="text-[10px] text-ink/50 mt-0.5">CPU</div>
            </div>
          </Ring>
        </div>
        <div className="flex justify-between text-[11px] font-medium tnum">
          <span className="text-ink/50">RAM</span>
          <span>{Math.round(mem * 100)}%</span>
          <span className="text-ink/50">Disk</span>
          <span>{Math.round(disk * 100)}%</span>
        </div>
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div className="w-full h-full flex items-center justify-around px-3">
        {gauges.map(g => (
          <div key={g.key} className="flex flex-col items-center gap-1.5">
            <Ring value={g.value} size={78} stroke={7.5} color={loadColor(g.value)}>
              <span className="text-ink/80">{g.icon}</span>
            </Ring>
            <div className="text-[17px] font-semibold tnum leading-none">{Math.round(g.value * 100)}%</div>
            <div className="text-[10px] text-ink/50 uppercase tracking-wide font-semibold">{g.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-bold uppercase tracking-wide text-ink/50">System</div>
        <div className="text-[11px] text-ink/50">Up {uptimeLabel(s.uptime)}</div>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <Ring value={disk} size={120} stroke={11} color="#0A84FF">
          <div className="text-center">
            <div className="text-[26px] font-semibold tnum leading-none">{Math.round(disk * 100)}%</div>
            <div className="text-[10px] text-ink/50 mt-1">{s.diskLabel} used</div>
          </div>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold">Local Disk ({s.diskLabel})</div>
          <div className="text-[12px] text-ink/60 mt-0.5">{formatBytes(s.diskTotal - s.diskUsed)} available</div>
          <div className="text-[12px] text-ink/40">of {formatBytes(s.diskTotal, 0)}</div>
        </div>
      </div>
      <div className="mt-auto space-y-3">
        {gauges.slice(0, 2).map(g => (
          <div key={g.key}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="flex items-center gap-1.5 font-semibold">
                {g.icon}
                {g.label}
              </span>
              <span className="text-ink/60 tnum">
                {g.key === 'mem' ? `${formatBytes(s.memUsed)} / ${formatBytes(s.memTotal, 0)}` : g.detail}
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.round(g.value * 100)}%`, background: loadColor(g.value) }}
              />
            </div>
          </div>
        ))}
        <div className="text-[10px] text-ink/40 truncate">{s.cpuModel}</div>
      </div>
    </div>
  );
};
