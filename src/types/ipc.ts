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

/** Result of picking photos for the Photos widget */
export interface PhotoPick {
  kind: 'folder' | 'photo';
  /** Folder name, or the photo's file name without extension */
  label: string;
  /** file:// URLs of the images */
  images: string[];
}

export type WidgetCommand =
  | { type: 'toggle-gallery'; value?: boolean }
  | { type: 'edit-mode'; value?: boolean }
  | { type: 'reset-layout' }
  /** Another app was activated: close gallery / edit mode / context menu */
  | { type: 'dismiss-overlay' };
