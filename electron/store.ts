import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { StoredConfig, WidgetInstance, DEFAULT_SETTINGS } from '../src/types/widget';

const DEFAULT_WIDGETS: WidgetInstance[] = [
  {
    id: 'clock-default',
    type: 'analog-clock',
    size: 'small',
    position: { x: 30, y: 30 },
    tint: '#FFB36B',
    settings: { use24h: false, showSeconds: true }
  },
  {
    id: 'date-default',
    type: 'date',
    size: 'small',
    position: { x: 220, y: 30 },
    tint: '#FF8A8A',
    settings: { firstDayOfWeek: 1 }
  },
  {
    id: 'system-default',
    type: 'system',
    size: 'medium',
    position: { x: 30, y: 220 },
    tint: '#7FE0C8',
    settings: {}
  },
  {
    id: 'notes-default',
    type: 'notes',
    size: 'medium',
    position: { x: 30, y: 410 },
    tint: '#FFD45C',
    settings: { text: 'Right-click any widget for options.\nOpen Settings from the tray icon.' }
  }
];

export class ConfigStore {
  private configPath: string;
  private data: StoredConfig;

  constructor() {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.configPath = path.join(userDataPath, 'widgets-config.json');
    this.data = this.load();
    this.migrateDateWidget();
  }

  /**
   * Small / medium Calendar widgets used to show today's date; that view is now its own
   * Date widget and Calendar shows only the month. Convert them once so existing
   * desktops look the same – Calendars added afterwards are left alone.
   */
  private migrateDateWidget(): void {
    if (this.data.settings.dateWidgetMigrated) return;
    const toDate = (type: string, size: string) => type === 'calendar' && (size === 'small' || size === 'medium');
    const widgets = this.data.widgets.map(w => {
      if (toDate(w.type, w.size)) return { ...w, type: 'date' as const };
      if (w.type === 'smart-stack' && Array.isArray(w.settings?.items)) {
        const items = w.settings!.items.map((it: { type: string; title?: string }) =>
          toDate(it.type, w.size) ? { ...it, type: 'date', title: it.title === 'Calendar' ? 'Date' : it.title } : it
        );
        return { ...w, settings: { ...w.settings, items } };
      }
      return w;
    });
    this.save({ widgets, settings: { ...this.data.settings, dateWidgetMigrated: true } });
  }

  private load(): StoredConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          widgets: Array.isArray(parsed.widgets) ? parsed.widgets : DEFAULT_WIDGETS,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.error('[ConfigStore] Failed to parse config, using defaults:', e);
    }
    return {
      widgets: DEFAULT_WIDGETS,
      settings: { ...DEFAULT_SETTINGS }
    };
  }

  public save(data: Partial<StoredConfig>): void {
    let nextWidgets = this.data.widgets;
    if (data.widgets) {
      if (this.data.widgets.length === data.widgets.length) {
        // Merge individual widget settings so concurrent edits in Settings and Desktop are not lost
        const prevMap = new Map(this.data.widgets.map(w => [w.id, w]));
        nextWidgets = data.widgets.map(incoming => {
          const prev = prevMap.get(incoming.id);
          if (!prev) return incoming;
          return {
            ...prev,
            ...incoming,
            settings: { ...(prev.settings || {}), ...(incoming.settings || {}) }
          };
        });
      } else {
        nextWidgets = data.widgets;
      }
    }
    this.data = {
      widgets: nextWidgets,
      settings: data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : this.data.settings
    };
    try {
      // Write to a temp file then rename, so a crash never leaves a half-written config
      const tmp = `${this.configPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.configPath);
    } catch (e) {
      console.error('[ConfigStore] Failed to write config:', e);
    }
  }

  public getConfig(): StoredConfig {
    return this.data;
  }
}
