export type WidgetSize = 'small' | 'medium' | 'large' | 'xl';

export type WidgetType =
  | 'calendar'
  | 'date'
  | 'photos'
  | 'photo-stack'
  | 'timer'
  | 'smart-stack'
  | 'system'
  | 'battery'
  | 'analog-clock'
  | 'flip-clock'
  | 'world-clock'
  | 'notes'
  | 'todo'
  | 'weather'
  | 'stopwatch'
  | 'calculator';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface CalendarSettings {
  showEvents: boolean;
  firstDayOfWeek: 0 | 1; // 0: Sunday, 1: Monday
}

export interface PhotosSettings {
  folderPath?: string;
  cycleIntervalSeconds: number;
  effect: 'ken-burns' | 'fade' | 'static';
  customImages?: string[];
  /** Where customImages came from: a whole folder or a single photo */
  source?: 'folder' | 'photo';
  /** Folder name or photo name shown on the widget */
  sourceLabel?: string;
}

export interface PhotoStackSettings {
  layout: 'fan' | 'cascade' | 'deck' | 'pile';
  /** White print-style border around each photo */
  frame: boolean;
  autoplay: boolean;
  autoplayIntervalSeconds: number;
  customImages?: string[];
  source?: 'folder' | 'photo';
  sourceLabel?: string;
}

export interface TimerSettings {
  defaultDurationSeconds: number;
  soundEnabled: boolean;
  soundVolume: number;
}

export interface ClockSettings {
  timeZone?: string; // IANA zone, undefined = local
  label?: string;
  use24h?: boolean;
  showSeconds?: boolean;
}

export interface WorldClockSettings {
  zones: { timeZone: string; label: string }[];
  use24h?: boolean;
}

export interface NotesSettings {
  text: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoSettings {
  title: string;
  items: TodoItem[];
}

export interface WeatherSettings {
  city?: string;
  latitude?: number;
  longitude?: number;
  unit: 'c' | 'f';
}

export interface SmartStackItem {
  id: string;
  type: Exclude<WidgetType, 'smart-stack'>;
  title: string;
  settings?: Record<string, any>;
}

export interface SmartStackSettings {
  items: SmartStackItem[];
  currentIndex: number;
  autoRotate: boolean;
  rotateIntervalSeconds: number;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  position: WidgetPosition;
  isLocked?: boolean;
  /** Per-widget tint colour (used by the Colourful style) */
  tint?: string;
  settings?: Record<string, any>;
}

export type ThemeMode = 'dark' | 'light' | 'auto';
export type WidgetStyle = 'glass' | 'solid' | 'colorful';

export interface AppSettings {
  theme: ThemeMode;
  style: WidgetStyle;
  /** Background opacity of widget surfaces, 0.3 - 1 */
  opacity: number;
  /** Corner radius in px */
  radius: number;
  accent: string;
  snapToGrid: boolean;
  gridSize: number;
  /** Gap kept between widgets when auto-placing / nudging */
  spacing: number;
  lockAll: boolean;
  autoStart: boolean;
  /** Keep widgets visible when Show Desktop (Win+D / 3-finger swipe) is used */
  showOnDesktop: boolean;
  /** Float widgets above every window */
  alwaysOnTop: boolean;
  showAddButton: boolean;
  /** Set after the installed app's first launch (turns on start-with-Windows once) */
  installedSetupDone?: boolean;
  /** Set once old small/medium Calendar widgets have been converted to Date widgets */
  dateWidgetMigrated?: boolean;
}

export interface StoredConfig {
  widgets: WidgetInstance[];
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  style: 'glass',
  opacity: 0.78,
  radius: 22,
  accent: '#007AFF',
  snapToGrid: true,
  gridSize: 10,
  spacing: 16,
  lockAll: false,
  autoStart: false,
  showOnDesktop: true,
  alwaysOnTop: false,
  showAddButton: true
};

/** macOS widget proportions */
export const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 170, height: 170 },
  medium: { width: 360, height: 170 },
  large: { width: 360, height: 360 },
  xl: { width: 740, height: 360 }
};

export const SIZE_LABELS: Record<WidgetSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xl: 'Extra Large'
};
