export interface SystemStats {
  cpu: number; // 0-100
  memUsed: number; // bytes
  memTotal: number;
  diskUsed: number;
  diskTotal: number;
  diskLabel: string;
  uptime: number; // seconds
  cpuModel: string;
}

export type WidgetCommand =
  | { type: 'toggle-gallery'; value?: boolean }
  | { type: 'edit-mode'; value?: boolean }
  | { type: 'reset-layout' };
