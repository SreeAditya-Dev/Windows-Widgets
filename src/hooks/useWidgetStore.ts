import { create } from 'zustand';
import {
  WidgetInstance,
  AppSettings,
  WidgetSize,
  WidgetType,
  StoredConfig,
  SmartStackItem,
  DEFAULT_SETTINGS,
  WIDGET_DIMENSIONS
} from '../types/widget';
import { WIDGET_META, defaultSettingsFor } from '../widgets/defaults';
import { findFreeSpot, firstFreeSlot, clampToBounds, getEdgeMargin } from '../lib/layout';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  widgetId: string | null;
}

interface WidgetStore {
  loaded: boolean;
  widgets: WidgetInstance[];
  settings: AppSettings;
  isGalleryOpen: boolean;
  editMode: boolean;
  contextMenu: ContextMenuState;
  activeDragId: string | null;

  init: () => Promise<void>;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, size: WidgetSize) => void;
  updateSettings: (id: string, settings: Record<string, any>) => void;
  updateWidget: (id: string, patch: Partial<WidgetInstance>) => void;
  setWidgetLocked: (id: string, locked: boolean) => void;
  addWidget: (type: WidgetType, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  createStack: (widgetId: string) => void;
  /** Break a Smart Stack apart into separate widgets */
  splitStack: (stackId: string) => void;
  /** Move one widget out of a Smart Stack onto the desktop */
  unstackItem: (stackId: string, itemId: string) => void;
  /** Combine several separate widgets into one Smart Stack */
  stackWidgets: (ids: string[]) => void;
  toggleGallery: (open?: boolean) => void;
  setEditMode: (on: boolean) => void;
  openContextMenu: (widgetId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  setSettings: (patch: Partial<AppSettings>) => void;
  setDragActive: (id: string | null) => void;
  resetLayout: () => void;
}

// ---- Persistence (debounced, only sends the parts that changed) ----
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let dirty = { widgets: false, settings: false };

const persist = (get: () => WidgetStore, what: { widgets?: boolean; settings?: boolean }) => {
  dirty = { widgets: dirty.widgets || !!what.widgets, settings: dirty.settings || !!what.settings };
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const { widgets, settings } = get();
    const payload: Partial<StoredConfig> = {};
    if (dirty.widgets) payload.widgets = widgets;
    if (dirty.settings) payload.settings = settings;
    dirty = { widgets: false, settings: false };
    window.electronAPI?.saveConfig(payload);
  }, 250);
};

// The Settings window is not full-screen: measure against the screen instead
const isSettingsWindow = () => window.location.hash.startsWith('#settings');
const screenBounds = () =>
  isSettingsWindow()
    ? { width: window.screen.availWidth, height: window.screen.availHeight }
    : { width: window.innerWidth, height: window.innerHeight };

const layoutOpts = (s: AppSettings) => {
  const bounds = screenBounds();
  const grid = s.snapToGrid ? s.gridSize : 1;
  const margin = getEdgeMargin(bounds, grid);
  return {
    gap: s.spacing,
    grid,
    bounds,
    margin
  };
};

export const useWidgetStore = create<WidgetStore>((set, get) => ({
  loaded: false,
  widgets: [],
  settings: DEFAULT_SETTINGS,
  isGalleryOpen: false,
  editMode: false,
  contextMenu: { isOpen: false, x: 0, y: 0, widgetId: null },
  activeDragId: null,

  init: async () => {
    const api = window.electronAPI;
    if (!api) {
      set({ loaded: true });
      return;
    }
    const config = await api.loadConfig();
    if (config) {
      const loadedSettings = { ...DEFAULT_SETTINGS, ...(config.settings || {}) };
      const bounds = screenBounds();
      const grid = loadedSettings.snapToGrid ? loadedSettings.gridSize : 1;
      const margin = getEdgeMargin(bounds, grid);
      const widgets = (config.widgets || []).map(w =>
        w.position.x < margin ? { ...w, position: { ...w.position, x: margin } } : w
      );
      set({
        widgets,
        settings: loadedSettings
      });
    }
    set({ loaded: true });

    // Another window (Settings) changed the config
    api.onConfigUpdated(cfg => {
      const loadedSettings = { ...DEFAULT_SETTINGS, ...(cfg.settings || {}) };
      const bounds = screenBounds();
      const grid = loadedSettings.snapToGrid ? loadedSettings.gridSize : 1;
      const margin = getEdgeMargin(bounds, grid);
      const widgets = (cfg.widgets || []).map(w =>
        w.position.x < margin ? { ...w, position: { ...w.position, x: margin } } : w
      );
      set({
        widgets,
        settings: loadedSettings
      });
    });

    api.onCommand(cmd => {
      switch (cmd.type) {
        case 'toggle-gallery':
          set(s => ({ isGalleryOpen: cmd.value ?? !s.isGalleryOpen, contextMenu: { ...s.contextMenu, isOpen: false } }));
          break;
        case 'edit-mode':
          get().setEditMode(cmd.value ?? !get().editMode);
          break;
        case 'reset-layout':
          get().resetLayout();
          break;
      }
    });
  },

  updatePosition: (id, x, y) => {
    const bounds = screenBounds();
    const grid = get().settings.snapToGrid ? get().settings.gridSize : 1;
    const margin = getEdgeMargin(bounds, grid);
    const safeX = Math.max(margin, x);
    set(state => ({
      widgets: state.widgets.map(w => (w.id === id ? { ...w, position: { x: safeX, y } } : w))
    }));
    persist(get, { widgets: true });
  },

  updateSize: (id, size) => {
    set(state => {
      const target = state.widgets.find(w => w.id === id);
      if (!target) return state;
      const others = state.widgets.filter(w => w.id !== id);
      const d = WIDGET_DIMENSIONS[size];
      const opts = layoutOpts(state.settings);
      const clamped = clampToBounds({ ...target.position, ...d }, opts.bounds, opts.margin);
      const position = findFreeSpot(clamped, size, others, opts);
      return {
        widgets: state.widgets.map(w => (w.id === id ? { ...w, size, position } : w))
      };
    });
    persist(get, { widgets: true });
  },

  updateSettings: (id, settingsUpdate) => {
    set(state => ({
      widgets: state.widgets.map(w =>
        w.id === id ? { ...w, settings: { ...(w.settings || {}), ...settingsUpdate } } : w
      )
    }));
    persist(get, { widgets: true });
  },

  updateWidget: (id, patch) => {
    set(state => ({
      widgets: state.widgets.map(w => (w.id === id ? { ...w, ...patch } : w))
    }));
    persist(get, { widgets: true });
  },

  setWidgetLocked: (id, locked) => get().updateWidget(id, { isLocked: locked }),

  addWidget: (type, size) => {
    const meta = WIDGET_META[type];
    const finalSize = size && meta.sizes.includes(size) ? size : meta.defaultSize;
    const state = get();
    const position = firstFreeSlot(finalSize, state.widgets, layoutOpts(state.settings));
    const newWidget: WidgetInstance = {
      id: `${type}-${Date.now()}`,
      type,
      size: finalSize,
      position,
      isLocked: false,
      tint: meta.tint,
      settings: defaultSettingsFor(type)
    };
    set(s => ({ widgets: [...s.widgets, newWidget] }));
    persist(get, { widgets: true });
  },

  removeWidget: id => {
    set(state => ({ widgets: state.widgets.filter(w => w.id !== id) }));
    persist(get, { widgets: true });
  },

  createStack: widgetId => {
    set(state => {
      const target = state.widgets.find(w => w.id === widgetId);
      if (!target || target.type === 'smart-stack') return state;
      const second: Exclude<WidgetType, 'smart-stack'> = target.type === 'calendar' ? 'analog-clock' : 'calendar';
      const now = Date.now();
      const stackSize = WIDGET_META['smart-stack'].sizes.includes(target.size) ? target.size : 'small';

      const stackWidget: WidgetInstance = {
        id: `stack-${now}`,
        type: 'smart-stack',
        size: stackSize,
        position: target.position,
        isLocked: target.isLocked,
        tint: target.tint,
        settings: {
          items: [
            { id: `item-1-${now}`, type: target.type, title: WIDGET_META[target.type].title, settings: target.settings },
            { id: `item-2-${now}`, type: second, title: WIDGET_META[second].title, settings: defaultSettingsFor(second) }
          ],
          currentIndex: 0,
          autoRotate: false,
          rotateIntervalSeconds: 30
        }
      };
      return { widgets: state.widgets.map(w => (w.id === widgetId ? stackWidget : w)) };
    });
    persist(get, { widgets: true });
  },

  splitStack: stackId => {
    set(state => {
      const stack = state.widgets.find(w => w.id === stackId);
      if (!stack || stack.type !== 'smart-stack') return state;
      const items: SmartStackItem[] = stack.settings?.items || [];
      const rest = state.widgets.filter(w => w.id !== stackId);
      const placed: WidgetInstance[] = [];
      const now = Date.now();
      items.forEach((it, i) => {
        const meta = WIDGET_META[it.type];
        if (!meta) return;
        const size = meta.sizes.includes(stack.size) ? stack.size : meta.defaultSize;
        const position = findFreeSpot(stack.position, size, [...rest, ...placed], layoutOpts(state.settings));
        placed.push({
          id: `${it.type}-${now + i}`,
          type: it.type,
          size,
          position,
          isLocked: false,
          tint: meta.tint,
          settings: { ...defaultSettingsFor(it.type), ...(it.settings || {}) }
        });
      });
      return { widgets: [...rest, ...placed] };
    });
    persist(get, { widgets: true });
  },

  unstackItem: (stackId, itemId) => {
    const stack = get().widgets.find(w => w.id === stackId);
    const items: SmartStackItem[] = stack?.settings?.items || [];
    const item = items.find(i => i.id === itemId);
    if (!stack || !item) return;
    if (items.length <= 2) {
      // A stack of one isn't a stack – split it completely
      get().splitStack(stackId);
      return;
    }
    set(state => {
      const meta = WIDGET_META[item.type];
      const size = meta.sizes.includes(stack.size) ? stack.size : meta.defaultSize;
      const position = findFreeSpot(stack.position, size, state.widgets, layoutOpts(state.settings));
      const remaining = items.filter(i => i.id !== itemId);
      const widgets = state.widgets.map(w =>
        w.id === stackId ? { ...w, settings: { ...w.settings, items: remaining, currentIndex: 0 } } : w
      );
      widgets.push({
        id: `${item.type}-${Date.now()}`,
        type: item.type,
        size,
        position,
        isLocked: false,
        tint: meta.tint,
        settings: { ...defaultSettingsFor(item.type), ...(item.settings || {}) }
      });
      return { widgets };
    });
    persist(get, { widgets: true });
  },

  stackWidgets: ids => {
    set(state => {
      const chosen = ids
        .map(id => state.widgets.find(w => w.id === id))
        .filter((w): w is WidgetInstance => !!w && w.type !== 'smart-stack');
      if (chosen.length < 2) return state;
      const first = chosen[0];
      const now = Date.now();
      const stack: WidgetInstance = {
        id: `smart-stack-${now}`,
        type: 'smart-stack',
        size: WIDGET_META['smart-stack'].sizes.includes(first.size) ? first.size : 'small',
        position: first.position,
        isLocked: first.isLocked,
        tint: first.tint,
        settings: {
          items: chosen.map((w, i) => ({
            id: `item-${now}-${i}`,
            type: w.type as Exclude<WidgetType, 'smart-stack'>,
            title: WIDGET_META[w.type].title,
            settings: w.settings
          })),
          currentIndex: 0,
          autoRotate: false,
          rotateIntervalSeconds: 30
        }
      };
      const chosenIds = new Set(chosen.map(w => w.id));
      return { widgets: [...state.widgets.filter(w => !chosenIds.has(w.id)), stack] };
    });
    persist(get, { widgets: true });
  },

  toggleGallery: open => {
    set(state => ({
      isGalleryOpen: open !== undefined ? open : !state.isGalleryOpen,
      contextMenu: { ...state.contextMenu, isOpen: false }
    }));
  },

  setEditMode: on => set({ editMode: on, contextMenu: { isOpen: false, x: 0, y: 0, widgetId: null } }),

  openContextMenu: (widgetId, x, y) => {
    set({ contextMenu: { isOpen: true, x, y, widgetId } });
  },

  closeContextMenu: () => {
    set({ contextMenu: { isOpen: false, x: 0, y: 0, widgetId: null } });
  },

  setSettings: patch => {
    set(state => ({ settings: { ...state.settings, ...patch } }));
    persist(get, { settings: true });
  },

  setDragActive: id => {
    set({ activeDragId: id });
  },

  resetLayout: () => {
    set(state => {
      const placed: WidgetInstance[] = [];
      for (const w of state.widgets) {
        const position = firstFreeSlot(w.size, placed, layoutOpts(state.settings));
        placed.push({ ...w, position });
      }
      return { widgets: placed };
    });
    persist(get, { widgets: true });
  }
}));
