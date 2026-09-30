import koffi from 'koffi';
import { BrowserWindow } from 'electron';

// Win32 Constants
const GWL_EXSTYLE = -20;
const WS_EX_TOOLWINDOW = 0x00000080;
const WS_EX_NOACTIVATE = 0x08000000;
const WS_EX_APPWINDOW = 0x00040000;

const HWND_TOPMOST = -1;
const HWND_NOTOPMOST = -2;
const HWND_BOTTOM = 1;

const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOACTIVATE = 0x0010;
const SWP_SHOWWINDOW = 0x0040;
const SWP_NOOWNERZORDER = 0x0200;
const SWP_FLAGS = SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_NOOWNERZORDER;

const SW_SHOWNOACTIVATE = 4;

interface Win32API {
  GetWindowLongPtr: (hwnd: number, index: number) => number;
  SetWindowLongPtr: (hwnd: number, index: number, newLong: number) => number;
  SetWindowPos: (hwnd: number, after: number, x: number, y: number, cx: number, cy: number, flags: number) => boolean;
  GetForegroundWindow: () => number;
  GetClassNameW: (hwnd: number, buf: Buffer, max: number) => number;
  IsIconic: (hwnd: number) => boolean;
  IsWindowVisible: (hwnd: number) => boolean;
  ShowWindow: (hwnd: number, cmd: number) => boolean;
  GetWindowThreadProcessId: (hwnd: number, pid: Buffer) => number;
  OpenProcess: (access: number, inherit: boolean, pid: number) => number;
  CloseHandle: (h: number) => boolean;
  QueryFullProcessImageNameW: (h: number, flags: number, buf: Buffer, size: Buffer) => boolean;
}

let api: Win32API | null = null;

if (process.platform === 'win32') {
  try {
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const is64 = process.arch === 'x64' || process.arch === 'arm64';

    api = {
      GetWindowLongPtr: user32.func(is64 ? 'GetWindowLongPtrW' : 'GetWindowLongW', 'intptr_t', ['intptr_t', 'int32_t']),
      SetWindowLongPtr: user32.func(is64 ? 'SetWindowLongPtrW' : 'SetWindowLongW', 'intptr_t', ['intptr_t', 'int32_t', 'intptr_t']),
      SetWindowPos: user32.func('SetWindowPos', 'bool', ['intptr_t', 'intptr_t', 'int', 'int', 'int', 'int', 'uint32_t']),
      GetForegroundWindow: user32.func('GetForegroundWindow', 'intptr_t', []),
      GetClassNameW: user32.func('GetClassNameW', 'int', ['intptr_t', 'void *', 'int']),
      IsIconic: user32.func('IsIconic', 'bool', ['intptr_t']),
      IsWindowVisible: user32.func('IsWindowVisible', 'bool', ['intptr_t']),
      ShowWindow: user32.func('ShowWindow', 'bool', ['intptr_t', 'int']),
      GetWindowThreadProcessId: user32.func('GetWindowThreadProcessId', 'uint32_t', ['intptr_t', 'void *']),
      OpenProcess: kernel32.func('OpenProcess', 'intptr_t', ['uint32_t', 'bool', 'uint32_t']),
      CloseHandle: kernel32.func('CloseHandle', 'bool', ['intptr_t']),
      QueryFullProcessImageNameW: kernel32.func('QueryFullProcessImageNameW', 'bool', ['intptr_t', 'uint32_t', 'void *', 'void *'])
    };
  } catch (err) {
    console.warn('[Win32] Failed to initialize koffi user32 bindings:', err);
  }
}

/**
 * Extracts the HWND from an Electron BrowserWindow handle Buffer as a number
 */
export function getHwnd(win: BrowserWindow): number {
  const buffer = win.getNativeWindowHandle();
  if (buffer.length >= 8) {
    return Number(buffer.readBigInt64LE(0));
  }
  return buffer.readInt32LE(0);
}

const classBuf = Buffer.alloc(512);
function getClassName(hwnd: number): string {
  if (!api || !hwnd) return '';
  const len = api.GetClassNameW(hwnd, classBuf, 256);
  return len > 0 ? classBuf.toString('utf16le', 0, len * 2) : '';
}

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
let ownHwnd = 0;
const pidBuf = Buffer.alloc(4);
const pathBuf = Buffer.alloc(1040);
const sizeBuf = Buffer.alloc(4);

/**
 * True for shell surfaces (desktop, tray flyout, context menus, taskbar) and for this
 * app's own helper windows (tray menu). File Explorer folder windows count as apps.
 */
function isShellWindow(hwnd: number): boolean {
  if (!api || !hwnd) return false;
  api.GetWindowThreadProcessId(hwnd, pidBuf);
  const pid = pidBuf.readUInt32LE(0);
  if (!pid) return false;
  if (pid === process.pid) return hwnd !== ownHwnd;
  const h = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
  if (!h) return false;
  try {
    sizeBuf.writeUInt32LE(520, 0);
    if (!api.QueryFullProcessImageNameW(h, 0, pathBuf, sizeBuf)) return false;
    const len = sizeBuf.readUInt32LE(0);
    const isExplorer = pathBuf.toString('utf16le', 0, len * 2).toLowerCase().endsWith('\\explorer.exe');
    return isExplorer && getClassName(hwnd) !== 'CabinetWClass';
  } finally {
    api.CloseHandle(h);
  }
}

function setExStyleFlag(win: BrowserWindow, flag: number, on: boolean) {
  if (!api) return;
  const hwnd = getHwnd(win);
  const cur = Number(api.GetWindowLongPtr(hwnd, GWL_EXSTYLE));
  const next = (on ? cur | flag : cur & ~flag) >>> 0;
  if (next !== cur >>> 0) api.SetWindowLongPtr(hwnd, GWL_EXSTYLE, next);
}

/**
 * Configures the window to behave as a desktop widget layer:
 * - Removed from Alt+Tab, Taskbar, and Task View (WS_EX_TOOLWINDOW)
 * - Does not steal focus when clicked (WS_EX_NOACTIVATE)
 */
export function pinWindowToDesktop(win: BrowserWindow): void {
  if (!api) return;
  try {
    const hwnd = getHwnd(win);
    const cur = Number(api.GetWindowLongPtr(hwnd, GWL_EXSTYLE));
    const next = ((cur | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) & ~WS_EX_APPWINDOW) >>> 0;
    api.SetWindowLongPtr(hwnd, GWL_EXSTYLE, next);
    api.SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_FLAGS);
  } catch (err) {
    console.error('[Win32] Failed to set window styles:', err);
  }
}

/** Allow / disallow the widget layer from taking keyboard focus. */
export function setWindowActivatable(win: BrowserWindow, activatable: boolean): void {
  try {
    setExStyleFlag(win, WS_EX_NOACTIVATE, !activatable);
  } catch (err) {
    console.error('[Win32] Failed to toggle WS_EX_NOACTIVATE:', err);
  }
}

export interface DesktopGuardOptions {
  /** Raise above the Show Desktop layer (Win+D / 3-finger swipe down) */
  showOnDesktop: boolean;
  /** Always float above every window */
  alwaysOnTop: boolean;
  /** Gallery / menu / edit mode open: stay on top while the user interacts */
  overlay: boolean;
}

const DESKTOP_CLASSES = new Set(['WorkerW', 'Progman']);
const MENU_CLASSES = new Set(['#32768']);

/**
 * Keeps the widget layer where macOS keeps its widgets: on the desktop.
 *
 * Normally the window sits at the very bottom of the z-order (behind every app).
 * When the desktop itself becomes the foreground window — which is exactly what
 * Show Desktop, Win+D, the 3-finger swipe down and clicking the desktop do — the
 * window is raised to TOPMOST so it stays visible above the desktop/peek layer.
 * As soon as an app is activated again it drops back to the bottom.
 *
 * This is the same technique Rainmeter uses for its "On Desktop" position.
 */
export function startDesktopGuard(win: BrowserWindow, getOptions: () => DesktopGuardOptions): () => void {
  if (!api) return () => {};
  const w32 = api;
  const hwnd = getHwnd(win);
  ownHwnd = hwnd;
  let applied: 'top' | 'bottom' | null = null;
  let lastForeground = -1;

  const apply = (want: 'top' | 'bottom') => {
    if (want === 'top') {
      w32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_FLAGS | SWP_SHOWWINDOW);
    } else {
      if (applied !== 'bottom') w32.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_FLAGS);
      w32.SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_FLAGS);
    }
    applied = want;
  };

  const tick = () => {
    if (win.isDestroyed()) return;
    try {
      // Never let the widget layer stay minimized / hidden
      if (w32.IsIconic(hwnd) || !w32.IsWindowVisible(hwnd)) {
        w32.ShowWindow(hwnd, SW_SHOWNOACTIVATE);
      }

      const opts = getOptions();
      const fg = Number(w32.GetForegroundWindow());
      const fgChanged = fg !== lastForeground;
      lastForeground = fg;

      let want: 'top' | 'bottom';
      if (opts.alwaysOnTop || opts.overlay) {
        want = 'top';
      } else if (fg === hwnd) {
        // User is typing into a widget – keep whatever layer we were on
        want = applied ?? 'bottom';
      } else if (opts.showOnDesktop && DESKTOP_CLASSES.has(getClassName(fg))) {
        want = 'top';
      } else if (MENU_CLASSES.has(getClassName(fg)) || isShellWindow(fg)) {
        // Tray flyout / context menu / taskbar is open – keep the current layer
        want = applied ?? 'bottom';
      } else {
        want = 'bottom';
      }

      // Re-apply bottom whenever focus moves, because activating our own window raises it
      if (want !== applied || want === 'bottom') {
        apply(want);
      }
    } catch (err) {
      console.error('[Win32] desktop guard tick failed:', err);
    }
  };

  tick();
  const timer = setInterval(tick, 120);
  return () => clearInterval(timer);
}
