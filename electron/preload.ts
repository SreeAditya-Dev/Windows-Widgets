import { contextBridge, ipcRenderer } from 'electron';
import type { StoredConfig } from '../src/types/widget';
import type { SystemStats, WidgetCommand, PhotoPick } from '../src/types/ipc';

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  loadConfig: () => Promise<StoredConfig>;
  saveConfig: (config: Partial<StoredConfig>) => Promise<boolean>;
  /** Pick a folder of photos or a single photo for the Photos widget */
  openPhotoDialog: (kind: PhotoPick['kind']) => Promise<PhotoPick | null>;
  getSystemStats: () => Promise<SystemStats>;
  /** Gallery / menu / edit mode open: keep the widget layer above apps */
  setOverlayActive: (active: boolean) => void;
  /** Give the widget layer keyboard focus (typing into notes, search…) */
  requestFocus: () => void;
  openSettings: (section?: string) => void;
  sendCommand: (cmd: WidgetCommand) => void;
  closeWindow: () => void;
  minimizeWindow: () => void;
  closeApp: () => void;
  onConfigUpdated: (callback: (config: StoredConfig) => void) => () => void;
  onCommand: (callback: (cmd: WidgetCommand) => void) => () => void;
  onOpenSection: (callback: (section: string) => void) => () => void;
}

const listen = <T>(channel: string, callback: (payload: T) => void) => {
  const handler = (_: unknown, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
};

const api: ElectronAPI = {
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: config => ipcRenderer.invoke('save-config', config),
  openPhotoDialog: kind => ipcRenderer.invoke('open-photo-dialog', kind),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  setOverlayActive: active => ipcRenderer.send('set-overlay-active', active),
  requestFocus: () => ipcRenderer.send('request-focus'),
  openSettings: section => ipcRenderer.send('open-settings', section),
  sendCommand: cmd => ipcRenderer.send('widget-command', cmd),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeApp: () => ipcRenderer.send('close-app'),
  onConfigUpdated: callback => listen('config-updated', callback),
  onCommand: callback => listen('widget-command', callback),
  onOpenSection: callback => listen('open-section', callback)
};

contextBridge.exposeInMainWorld('electronAPI', api);
