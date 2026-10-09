import koffi from 'koffi';
import { BrowserWindow } from 'electron';

// Win32 Constants
const GWL_EXSTYLE = -20;
const WS_EX_TOOLWINDOW = 0x00000080;
const WS_EX_NOACTIVATE = 0x08000000;
const WS_EX_APPWINDOW = 0x00040000;
const WS_EX_TOPMOST = 0x00000008;

const GW_HWNDNEXT = 2;
const DWMWA_CLOAKED = 14;

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
  GetTopWindow: (hwnd: number) => number;
  GetWindow: (hwnd: number, cmd: number) => number;
  DwmGetWindowAttribute: ((hwnd: number, attr: number, out: Buffer, size: number) => number) | null;
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
      QueryFullProcessImageNameW: kernel32.func('QueryFullProcessImageNameW', 'bool', ['intptr_t', 'uint32_t', 'void *', 'void *']),
      GetTopWindow: user32.func('GetTopWindow', 'intptr_t', ['intptr_t']),
      GetWindow: user32.func('GetWindow', 'intptr_t', ['intptr_t', 'uint32_t']),
      DwmGetWindowAttribute: null
    };
    try {
      const dwmapi = koffi.load('dwmapi.dll');
      api.DwmGetWindowAttribute = dwmapi.func('DwmGetWindowAttribute', 'int32_t', ['intptr_t', 'uint32_t', 'void *', 'uint32_t']);
    } catch {
      /* cloak detection unavailable – treated as not cloaked */
    }
  } catch (err) {
    console.warn('[Win32] Failed to initialize koffi user32 bindings:', err);
  }
}

// Foreground-change notifications, so the guard reacts the instant an app is activated
// instead of waiting for the next poll (which let widgets flash over the app)
const EVENT_SYSTEM_FOREGROUND = 0x0003;
const EVENT_SYSTEM_MINIMIZEEND = 0x0017;
const WINEVENT_OUTOFCONTEXT = 0x0000;

let hookApi: {
  proto: koffi.IKoffiCType;
  SetWinEventHook: (min: number, max: number, mod: number, fn: unknown, pid: number, tid: number, flags: number) => number;
  UnhookWinEvent: (hook: number) => boolean;
} | null = null;

if (api) {
  try {
    const user32 = koffi.load('user32.dll');
    const proto = koffi.proto(
      'void __stdcall WinEventProc(intptr_t hook, uint32_t event, intptr_t hwnd, int32_t idObject, int32_t idChild, uint32_t thread, uint32_t time)'
    );
    hookApi = {
      proto,
      SetWinEventHook: user32.func('SetWinEventHook', 'intptr_t', ['uint32_t', 'uint32_t', 'intptr_t', koffi.pointer(proto), 'uint32_t', 'uint32_t', 'uint32_t']),
      UnhookWinEvent: user32.func('UnhookWinEvent', 'bool', ['intptr_t'])
    };
  } catch (err) {
    console.warn('[Win32] WinEvent hook unavailable, falling back to polling only:', err);
  }
}

/** Calls `onChange` whenever the foreground window changes. Returns an unhook function. */
function watchForeground(onChange: () => void): () => void {
  if (!hookApi) return () => {};
  const h = hookApi;
  try {
    const cb = koffi.register(() => onChange(), koffi.pointer(h.proto));
    const hook = h.SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_MINIMIZEEND, 0, cb, 0, 0, WINEVENT_OUTOFCONTEXT);
    return () => {
      if (hook) h.UnhookWinEvent(hook);
      koffi.unregister(cb);
    };
  } catch (err) {
    console.warn('[Win32] Failed to install foreground hook:', err);
    return () => {};
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
  // The tray menu (and its hidden owner window) take the foreground while open; treating
  // them as unknown dropped the widget layer behind the Show Desktop layer. Settings is
  // handled separately by the guard before this check matters.
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

/** True for windows owned by this app (widget layer, Settings, file dialogs, tray menu). */
function isOwnProcessWindow(hwnd: number): boolean {
  if (!api || !hwnd) return false;
  api.GetWindowThreadProcessId(hwnd, pidBuf);
  return pidBuf.readUInt32LE(0) === process.pid;
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

/** Immediately pushes the window to the bottom of the z-order behind all apps. */
export function lowerWindowToBottom(win: BrowserWindow): void {
  if (!api || win.isDestroyed()) return;
  try {
    const hwnd = getHwnd(win);
    api.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_FLAGS);
    api.SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_FLAGS);
  } catch (err) {
    console.error('[Win32] Failed to lower window to bottom:', err);
  }
}

export interface DesktopGuardOptions {
  /** Raise above the Show Desktop layer (Win+D / 3-finger swipe down) */
  showOnDesktop: boolean;
  /** Always float above every window */
  alwaysOnTop: boolean;
  /** Gallery / menu / edit mode open: stay on top while the user interacts */
  overlay: boolean;
  /** Settings window is currently open / visible: widgets must stay below it */
  isSettingsOpen?: boolean;
}

const DESKTOP_CLASSES = new Set(['WorkerW', 'Progman']);
const MENU_CLASSES = new Set(['#32768']);

const cloakBuf = Buffer.alloc(4);
function isCloaked(hwnd: number): boolean {
  if (!api?.DwmGetWindowAttribute) return false;
  cloakBuf.writeUInt32LE(0, 0);
  return api.DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, cloakBuf, 4) === 0 && cloakBuf.readUInt32LE(0) !== 0;
}

/**
 * True when the desktop is actually in front of every app window – Show Desktop
 * (Win+D, 3-finger swipe, the taskbar corner) raises a desktop WorkerW above them,
 * or all apps are minimized. Merely clicking the wallpaper focuses the desktop
 * while apps stay on screen; raising the widgets then would cover those apps.
 */
function isDesktopInFront(): boolean {
  if (!api) return false;
  let h = Number(api.GetTopWindow(0));
  for (let i = 0; h && i < 2000; i++, h = Number(api.GetWindow(h, GW_HWNDNEXT))) {
    if (h === ownHwnd || !api.IsWindowVisible(h) || api.IsIconic(h)) continue;
    const ex = Number(api.GetWindowLongPtr(h, GWL_EXSTYLE));
    // Topmost windows (taskbar, overlays, our own layer when raised) and tool palettes don't count
    if (ex & (WS_EX_TOPMOST | WS_EX_TOOLWINDOW)) continue;
    if (isCloaked(h)) continue; // suspended UWP apps, other virtual desktops
    if (DESKTOP_CLASSES.has(getClassName(h))) return true;
    if (isOwnProcessWindow(h)) continue;
    return false; // a visible app window sits above the desktop
  }
  return true;
}

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
let currentGuardTick: ((forceReapply?: boolean) => void) | null = null;

/** Forces the desktop guard to re-evaluate and re-apply the proper Z-order immediately. */
export function reapplyDesktopGuard(): void {
  if (currentGuardTick) currentGuardTick(true);
}

export function startDesktopGuard(
  win: BrowserWindow,
  getOptions: () => DesktopGuardOptions,
  /** Called when a normal app is activated while overlay UI (gallery / edit mode / menu) is open */
  onAppActivated?: () => void
): () => void {
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

  const tick = (forceReapply = false) => {
    if (win.isDestroyed()) return;
    try {
      if (forceReapply) applied = null;

      // Never let the widget layer stay minimized / hidden
      if (w32.IsIconic(hwnd) || !w32.IsWindowVisible(hwnd)) {
        w32.ShowWindow(hwnd, SW_SHOWNOACTIVATE);
      }

      const opts = getOptions();
      const fg = Number(w32.GetForegroundWindow());
      const fgChanged = fg !== lastForeground;
      lastForeground = fg;

      const fgClass = getClassName(fg);
      const isDesktop = DESKTOP_CLASSES.has(fgClass);
      const isShell = MENU_CLASSES.has(fgClass) || isShellWindow(fg);
      const isApp = !!fg && fg !== hwnd && !isDesktop && !isShell && !isOwnProcessWindow(fg);

      // Switching to another app ends widget editing (like macOS), so the overlay
      // can never leave the widget layer floating above that app
      if (opts.overlay && !opts.alwaysOnTop && isApp && fgChanged) {
        onAppActivated?.();
        opts.overlay = false;
      }

      // Focus is on our own layer or a shell surface (taskbar, tray, menu): stay raised only
      // while Show Desktop is still in effect, so the layer can never sit over an app window
      const stayRaised = () => (applied === 'top' && opts.showOnDesktop && isDesktopInFront() ? 'top' : 'bottom');

      let want: 'top' | 'bottom';
      if (opts.overlay) {
        // Gallery / edit mode / menu is open – it must be visible to be usable
        want = 'top';
      } else if (opts.isSettingsOpen) {
        // While the Settings window is open, widgets must stay on the desktop layer behind it
        want = 'bottom';
      } else if (opts.alwaysOnTop) {
        want = 'top';
      } else if (fg === hwnd) {
        // User is typing into a widget
        want = stayRaised();
      } else if (opts.showOnDesktop && isDesktop) {
        want = isDesktopInFront() ? 'top' : 'bottom';
      } else if (isShell) {
        // Tray flyout / context menu / taskbar is open
        want = stayRaised();
      } else {
        want = 'bottom';
      }

      // Re-apply bottom only when state changes or when focus moves
      if (want !== applied || (want === 'bottom' && fgChanged)) {
        apply(want);
      }
    } catch (err) {
      console.error('[Win32] desktop guard tick failed:', err);
    }
  };

  currentGuardTick = tick;
  tick();
  const unhook = watchForeground(() => tick());
  const timer = setInterval(() => tick(), 120);
  return () => {
    currentGuardTick = null;
    clearInterval(timer);
    unhook();
  };
}
