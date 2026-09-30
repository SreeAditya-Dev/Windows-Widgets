import { app, BrowserWindow, screen, ipcMain, dialog, nativeTheme, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { pinWindowToDesktop, startDesktopGuard, setWindowActivatable } from './win32';
import { ConfigStore } from './store';
import { setupTray, refreshTray, TrayActions } from './tray';
import type { StoredConfig, AppSettings } from '../src/types/widget';
import type { SystemStats, WidgetCommand } from '../src/types/ipc';

// ==========================================
// 1. RAM & Chromium Optimization Flags
// ==========================================
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=96');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-sync');

let widgetWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let store: ConfigStore | null = null;
let overlayActive = false;
let stopGuard: (() => void) | null = null;

// Keep settings in the same folder for the dev build and the installed app
// (the installed app is named "Desktop Widgets", which would otherwise start a fresh config)
app.setPath('userData', path.join(app.getPath('appData'), 'mac-widgets-windows'));
if (process.platform === 'win32') app.setAppUserModelId('com.sreeaditya.desktopwidgets');

// Prevent multiple instances: running it again opens Settings
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Launching again (e.g. the "Widget Settings" Start-menu shortcut) opens Settings
app.on('second-instance', () => openSettings());

const wantsSettingsOnLaunch = process.argv.includes('--settings');

const rendererEntry = (win: BrowserWindow, hash?: string) => {
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + (hash ? `#${hash}` : ''));
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), hash ? { hash } : undefined);
  }
};

const settings = (): AppSettings => store!.getConfig().settings;

// ==========================================
// 2. Widget layer window (full-screen, transparent, click-through)
// ==========================================
function createWidgetWindow(): BrowserWindow {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    type: 'toolbar', // Removes from standard Alt+Tab
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: true,
    alwaysOnTop: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      webSecurity: false
    }
  });

  // Clicks pass straight through to the desktop until the pointer is over a widget
  win.setIgnoreMouseEvents(true, { forward: true });
  rendererEntry(win);

  win.once('ready-to-show', () => {
    win.showInactive();
    pinWindowToDesktop(win);
    stopGuard?.();
    stopGuard = startDesktopGuard(win, () => ({
      showOnDesktop: settings().showOnDesktop,
      alwaysOnTop: settings().alwaysOnTop,
      overlay: overlayActive
    }));
  });

  // Show Desktop must never hide the widget layer
  win.on('minimize', () => win.restore());
  win.on('hide', () => setTimeout(() => !win.isDestroyed() && win.showInactive(), 50));

  // After typing into a widget, go back to being a non-activating desktop layer
  win.on('blur', () => setWindowActivatable(win, false));

  return win;
}

// ==========================================
// 3. Settings window (macOS System Settings style)
// ==========================================
function openSettings(section?: string) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.show();
    settingsWindow.focus();
    if (section) settingsWindow.webContents.send('open-section', section);
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'Widget Settings',
    icon: appIconPath(),
    titleBarStyle: 'hidden',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e20' : '#f5f5f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  rendererEntry(settingsWindow, section ? `settings/${section}` : 'settings');
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ==========================================
// 4. Helpers
// ==========================================
function sendCommand(cmd: WidgetCommand) {
  if (!widgetWindow) return;
  if (cmd.type === 'toggle-gallery' || cmd.type === 'edit-mode') {
    // Make sure the widget layer is visible above apps for the overlay UI
    overlayActive = true;
  }
  widgetWindow.webContents.send('widget-command', cmd);
}

function applyLoginItem(enabled: boolean) {
  const opts: Electron.Settings = { openAtLogin: enabled };
  if (!app.isPackaged) {
    // Unpackaged: launch electron.exe with this project as the app path
    opts.path = process.execPath;
    opts.args = [app.getAppPath()];
  }
  const current = app.getLoginItemSettings(opts.path ? { path: opts.path, args: opts.args } : undefined).openAtLogin;
  if (current !== enabled) app.setLoginItemSettings(opts);
}

let prevCpuTimes = os.cpus().map(c => c.times);
let lastStats: { at: number; stats: SystemStats } | null = null;

function readSystemStats(): SystemStats {
  if (lastStats && Date.now() - lastStats.at < 1000) return lastStats.stats;

  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  cpus.forEach((c, i) => {
    const p = prevCpuTimes[i] || c.times;
    const t = c.times;
    total += t.user - p.user + (t.nice - p.nice) + (t.sys - p.sys) + (t.irq - p.irq) + (t.idle - p.idle);
    idle += t.idle - p.idle;
  });
  prevCpuTimes = cpus.map(c => c.times);

  const drive = (process.env.SystemDrive || 'C:') + '\\';
  let diskTotal = 0;
  let diskFree = 0;
  try {
    const s = fs.statfsSync(drive);
    diskTotal = s.blocks * s.bsize;
    diskFree = s.bavail * s.bsize;
  } catch {
    /* ignore */
  }

  const stats: SystemStats = {
    cpu: total > 0 ? Math.max(0, Math.min(100, (1 - idle / total) * 100)) : 0,
    memTotal: os.totalmem(),
    memUsed: os.totalmem() - os.freemem(),
    diskTotal,
    diskUsed: diskTotal - diskFree,
    diskLabel: drive.replace('\\', ''),
    uptime: os.uptime(),
    cpuModel: cpus[0]?.model?.trim() || 'CPU'
  };
  lastStats = { at: Date.now(), stats };
  return stats;
}

/**
 * Start-menu entries so Settings can be opened like a normal app:
 *   Start ▸ Desktop Widgets ▸ Desktop Widgets / Widget Settings
 */
function ensureStartMenuShortcuts() {
  if (process.platform !== 'win32') return;
  try {
    const programs = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const make = (file: string, extraArgs: string, description: string) => {
      const baseArgs = app.isPackaged ? '' : `"${app.getAppPath()}"`;
      // 'replace' only works on an existing shortcut; 'create' only on a new one
      return shell.writeShortcutLink(file, fs.existsSync(file) ? 'replace' : 'create', {
        target: process.execPath,
        args: [baseArgs, extraArgs].filter(Boolean).join(' '),
        cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
        description,
        icon: process.execPath,
        iconIndex: 0,
        appUserModelId: 'com.sreeaditya.desktopwidgets'
      });
    };

    const devDir = path.join(programs, 'Desktop Widgets');
    if (app.isPackaged) {
      // The installer already adds "Desktop Widgets"; add a direct Settings entry next to it
      // and remove the developer shortcuts that pointed at electron.exe
      if (fs.existsSync(devDir)) fs.rmSync(devDir, { recursive: true, force: true });
      make(path.join(programs, 'Widget Settings.lnk'), '--settings', 'Customise your desktop widgets');
    } else {
      fs.mkdirSync(devDir, { recursive: true });
      make(path.join(devDir, 'Desktop Widgets.lnk'), '', 'macOS-style desktop widgets');
      make(path.join(devDir, 'Widget Settings.lnk'), '--settings', 'Customise your desktop widgets');
    }
  } catch (e) {
    console.error('[Main] Could not create Start menu shortcuts:', e);
  }
}

function appIconPath() {
  return path.join(__dirname, '../dist/icon.png');
}

// ==========================================
// 5. App lifecycle
// ==========================================
app.whenReady().then(() => {
  store = new ConfigStore();
  if (app.isPackaged && !settings().installedSetupDone) {
    store.save({ settings: { ...settings(), autoStart: true, installedSetupDone: true } });
  }
  applyLoginItem(settings().autoStart);

  widgetWindow = createWidgetWindow();
  ensureStartMenuShortcuts();
  if (wantsSettingsOnLaunch) widgetWindow.once('ready-to-show', () => openSettings());

  const trayActions: TrayActions = {
    onAddWidgets: () => sendCommand({ type: 'toggle-gallery', value: true }),
    onEditWidgets: () => sendCommand({ type: 'edit-mode', value: true }),
    onOpenSettings: () => openSettings(),
    isLocked: () => settings().lockAll,
    onToggleLock: locked => {
      store!.save({ settings: { ...settings(), lockAll: locked } });
      broadcastConfig(null);
    }
  };
  setupTray(trayActions, appIconPath());

  function broadcastConfig(sender: Electron.WebContents | null) {
    const cfg = store!.getConfig();
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.isDestroyed() || w.webContents === sender) continue;
      w.webContents.send('config-updated', cfg);
    }
    refreshTray(trayActions);
  }

  // ---- IPC ----
  ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean, options) => {
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, options);
  });

  ipcMain.handle('load-config', () => store?.getConfig());

  ipcMain.handle('save-config', (event, newConfig: Partial<StoredConfig>) => {
    const before = settings();
    store!.save(newConfig);
    const after = settings();
    if (before.autoStart !== after.autoStart) applyLoginItem(after.autoStart);
    broadcastConfig(event.sender);
    return true;
  });

  ipcMain.handle('get-system-stats', () => readSystemStats());

  ipcMain.on('set-overlay-active', (_e, active: boolean) => {
    overlayActive = !!active;
  });

  ipcMain.on('request-focus', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win !== widgetWindow) return;
    setWindowActivatable(win, true);
    win.focus();
    win.webContents.focus();
  });

  ipcMain.on('open-settings', (_e, section?: string) => openSettings(section));

  ipcMain.on('widget-command', (_e, cmd: WidgetCommand) => sendCommand(cmd));

  ipcMain.on('close-window', event => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.on('minimize-window', event => BrowserWindow.fromWebContents(event.sender)?.minimize());

  ipcMain.handle('open-directory-dialog', async event => {
    const parent = BrowserWindow.fromWebContents(event.sender) || undefined;
    if (parent === widgetWindow) setWindowActivatable(parent!, true);
    const result = parent
      ? await dialog.showOpenDialog(parent, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });

    if (result.canceled || result.filePaths.length === 0) return null;

    const folder = result.filePaths[0];
    try {
      const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif', '.gif']);
      return fs
        .readdirSync(folder)
        .filter(f => imageExtensions.has(path.extname(f).toLowerCase()))
        .map(f => `file:///${path.join(folder, f).replace(/\\/g, '/')}`);
    } catch (e) {
      console.error('[Main] Failed to read image folder:', e);
      return [];
    }
  });

  ipcMain.on('close-app', () => app.quit());

  screen.on('display-metrics-changed', () => {
    if (!widgetWindow) return;
    widgetWindow.setBounds(screen.getPrimaryDisplay().workArea);
    pinWindowToDesktop(widgetWindow);
  });
});

app.on('before-quit', () => {
  stopGuard?.();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
