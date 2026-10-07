import { WidgetType, WidgetSize } from '../types/widget';

/** Metadata shared by the store, gallery and settings (no React components here). */
export interface WidgetMeta {
  type: WidgetType;
  title: string;
  description: string;
  category: 'Clocks' | 'Productivity' | 'System' | 'Utilities' | 'Photos' | 'Featured';
  sizes: WidgetSize[];
  defaultSize: WidgetSize;
  tint: string;
  /** Widget paints its own full-bleed background (photos, weather) */
  fullBleed?: boolean;
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  'analog-clock': {
    type: 'analog-clock',
    title: 'Clock',
    description: 'A classic analog clock face with a smooth sweeping second hand.',
    category: 'Clocks',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    tint: '#FFB36B'
  },
  'flip-clock': {
    type: 'flip-clock',
    title: 'Flip Clock',
    description: 'Retro flip-card digits showing hours, minutes and seconds.',
    category: 'Clocks',
    sizes: ['medium', 'large'],
    defaultSize: 'medium',
    tint: '#9AA5FF'
  },
  'world-clock': {
    type: 'world-clock',
    title: 'World Clock',
    description: 'Keep an eye on the time in up to four cities around the world.',
    category: 'Clocks',
    sizes: ['medium', 'large'],
    defaultSize: 'medium',
    tint: '#7FD1FF'
  },
  date: {
    type: 'date',
    title: 'Date',
    description: 'Today’s date — add the medium size to see the month beside it.',
    category: 'Productivity',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    tint: '#FF8A8A'
  },
  calendar: {
    type: 'calendar',
    title: 'Calendar',
    description: 'The month at a glance — the medium size shows next month too.',
    category: 'Productivity',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'small',
    tint: '#FF8A8A'
  },
  notes: {
    type: 'notes',
    title: 'Notes',
    description: 'A sticky note right on your desktop. Just click and type.',
    category: 'Productivity',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium',
    tint: '#FFD45C'
  },
  todo: {
    type: 'todo',
    title: 'Reminders',
    description: 'A simple checklist for the things you need to get done today.',
    category: 'Productivity',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium',
    tint: '#8FE3A1'
  },
  timer: {
    type: 'timer',
    title: 'Timer',
    description: 'Countdowns, focus sprints and pomodoros with a gentle chime.',
    category: 'Utilities',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    tint: '#FFB36B'
  },
  stopwatch: {
    type: 'stopwatch',
    title: 'Stopwatch',
    description: 'Precise stopwatch with lap times.',
    category: 'Utilities',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    tint: '#FF9EC7'
  },
  calculator: {
    type: 'calculator',
    title: 'Calculator',
    description: 'A handy calculator that is always one click away.',
    category: 'Utilities',
    sizes: ['large'],
    defaultSize: 'large',
    tint: '#C3A6FF'
  },
  weather: {
    type: 'weather',
    title: 'Weather',
    description: 'Current conditions and forecast for any city (Open-Meteo).',
    category: 'Utilities',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'small',
    tint: '#6FB7FF',
    fullBleed: true
  },
  system: {
    type: 'system',
    title: 'System Monitor',
    description: 'Live CPU, memory and disk usage rings.',
    category: 'System',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium',
    tint: '#7FE0C8'
  },
  battery: {
    type: 'battery',
    title: 'Batteries',
    description: 'Battery level and charging status of this PC.',
    category: 'System',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    tint: '#9BE38A'
  },
  photos: {
    type: 'photos',
    title: 'Photos',
    description: 'Relive favourite memories from any folder on your PC.',
    category: 'Photos',
    sizes: ['small', 'medium', 'large', 'xl'],
    defaultSize: 'medium',
    tint: '#B7C4D6',
    fullBleed: true
  },
  'smart-stack': {
    type: 'smart-stack',
    title: 'Smart Stack',
    description: 'Several widgets in one spot — scroll over it to flip between them.',
    category: 'Featured',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'small',
    tint: '#C3A6FF'
  }
};

export const WIDGET_ORDER: WidgetType[] = [
  'analog-clock',
  'flip-clock',
  'world-clock',
  'date',
  'calendar',
  'notes',
  'todo',
  'weather',
  'system',
  'battery',
  'timer',
  'stopwatch',
  'calculator',
  'photos',
  'smart-stack'
];

const uid = () => Math.random().toString(36).slice(2, 9);

export function defaultSettingsFor(type: WidgetType): Record<string, any> {
  switch (type) {
    case 'calendar':
      return { showEvents: false, firstDayOfWeek: 1 };
    case 'date':
      return { firstDayOfWeek: 1 };
    case 'photos':
      return { cycleIntervalSeconds: 15, effect: 'ken-burns' };
    case 'timer':
      return { defaultDurationSeconds: 300, soundEnabled: true, soundVolume: 0.8 };
    case 'analog-clock':
    case 'flip-clock':
      return { use24h: false, showSeconds: true };
    case 'world-clock':
      return {
        use24h: false,
        zones: [
          { timeZone: 'America/Los_Angeles', label: 'Cupertino' },
          { timeZone: 'America/New_York', label: 'New York' },
          { timeZone: 'Europe/London', label: 'London' },
          { timeZone: 'Asia/Tokyo', label: 'Tokyo' }
        ]
      };
    case 'notes':
      return { text: '' };
    case 'todo':
      return {
        title: 'Today',
        items: [
          { id: uid(), text: 'Plan the day', done: false },
          { id: uid(), text: 'Drink water', done: true }
        ]
      };
    case 'weather':
      return { unit: 'c' };
    case 'smart-stack':
      return {
        items: [
          { id: uid(), type: 'analog-clock', title: 'Clock' },
          { id: uid(), type: 'date', title: 'Date' },
          { id: uid(), type: 'weather', title: 'Weather', settings: { unit: 'c' } }
        ],
        currentIndex: 0,
        autoRotate: false,
        rotateIntervalSeconds: 30
      };
    default:
      return {};
  }
}

export const TINT_SWATCHES = [
  '#FF8A8A',
  '#FFB36B',
  '#FFD45C',
  '#8FE3A1',
  '#7FE0C8',
  '#7FD1FF',
  '#6FB7FF',
  '#9AA5FF',
  '#C3A6FF',
  '#FF9EC7',
  '#B7C4D6',
  '#FFFFFF'
];

export const ACCENT_SWATCHES = ['#007AFF', '#AF52DE', '#FF2D55', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#8E8E93'];
