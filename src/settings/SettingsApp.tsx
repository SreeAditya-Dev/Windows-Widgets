import React, { useEffect, useState } from 'react';
import { useWidgetStore } from '../hooks/useWidgetStore';
import { useResolvedScheme, useRootVars } from '../hooks/useAppearance';
import { WIDGET_META, ACCENT_SWATCHES } from '../widgets/defaults';
import { WIDGET_ICONS } from '../widgets/registry';
import { SIZE_LABELS, WidgetStyle, ThemeMode, WidgetType } from '../types/widget';
import { WidgetPreview } from '../components/WidgetPreview';
import { WidgetEditor } from './WidgetEditor';
import { Group, Row, Switch, Slider, Swatches, Button } from './controls';
import { Settings2, Palette, LayoutGrid, Boxes, Info, Search } from 'lucide-react';

type Section = 'general' | 'appearance' | 'layout' | 'widgets' | 'about';

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'general', label: 'General', icon: <Settings2 size={14} />, color: '#8E8E93' },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} />, color: '#1C1C1E' },
  { id: 'layout', label: 'Desktop & Layout', icon: <LayoutGrid size={14} />, color: '#0A84FF' },
  { id: 'widgets', label: 'Widgets', icon: <Boxes size={14} />, color: '#FF9F0A' },
  { id: 'about', label: 'About', icon: <Info size={14} />, color: '#30B0C7' }
];

const parseHash = (): { section: Section; widgetId: string | null } => {
  const rest = window.location.hash.replace(/^#settings\/?/, '');
  if (rest.startsWith('widget:')) return { section: 'widgets', widgetId: rest.slice(7) };
  if (SECTIONS.some(s => s.id === rest)) return { section: rest as Section, widgetId: null };
  return { section: 'general', widgetId: null };
};

const TrafficLights: React.FC = () => (
  <div className="flex items-center gap-2 titlebar-nodrag group">
    <button onClick={() => window.electronAPI?.closeWindow()} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10 flex items-center justify-center" title="Close">
      <span className="opacity-0 group-hover:opacity-100 text-[8px] leading-none text-black/60 font-bold">×</span>
    </button>
    <button onClick={() => window.electronAPI?.minimizeWindow()} className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10 flex items-center justify-center" title="Minimise">
      <span className="opacity-0 group-hover:opacity-100 text-[9px] leading-none text-black/60 font-bold -mt-px">−</span>
    </button>
    <span className="w-3 h-3 rounded-full bg-ink/20 border border-black/10" />
  </div>
);

export const SettingsApp: React.FC = () => {
  const init = useWidgetStore(s => s.init);
  const loaded = useWidgetStore(s => s.loaded);
  const settings = useWidgetStore(s => s.settings);
  const widgets = useWidgetStore(s => s.widgets);
  const setSettings = useWidgetStore(s => s.setSettings);
  const splitStack = useWidgetStore(s => s.splitStack);
  const stackWidgets = useWidgetStore(s => s.stackWidgets);
  const [picked, setPicked] = useState<string[]>([]);
  const scheme = useResolvedScheme();
  const rootVars = useRootVars();

  const initial = parseHash();
  const [section, setSection] = useState<Section>(initial.section);
  const [selectedId, setSelectedId] = useState<string | null>(initial.widgetId);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    init();
    document.title = 'Widget Settings';
  }, [init]);

  useEffect(
    () =>
      window.electronAPI?.onOpenSection(sec => {
        if (sec.startsWith('widget:')) {
          setSection('widgets');
          setSelectedId(sec.slice(7));
        } else if (SECTIONS.some(s => s.id === sec)) setSection(sec as Section);
      }),
    []
  );

  const cmd = window.electronAPI?.sendCommand;
  const selected = widgets.find(w => w.id === selectedId) || null;

  const vars: React.CSSProperties =
    scheme === 'dark'
      ? { ['--card' as any]: 'rgba(255,255,255,0.05)', ['--btn' as any]: 'rgba(255,255,255,0.1)', ['--seg-on' as any]: 'rgba(255,255,255,0.22)' }
      : { ['--card' as any]: '#ffffff', ['--btn' as any]: '#ffffff', ['--seg-on' as any]: '#ffffff' };

  const content = () => {
    switch (section) {
      case 'general':
        return (
          <>
            <Group title="Startup">
              <Row label="Open widgets when I sign in" hint="Starts the widgets automatically with Windows.">
                <Switch on={settings.autoStart} onChange={v => setSettings({ autoStart: v })} />
              </Row>
            </Group>
            <Group
              title="Desktop"
              footer="Like macOS, widgets live on your desktop behind your apps. Show Desktop (Win + D or the three-finger swipe down on the touchpad) reveals them instead of hiding them."
            >
              <Row label="Keep widgets visible on Show Desktop" hint="Win + D, the taskbar corner button and three-finger swipe down">
                <Switch on={settings.showOnDesktop} onChange={v => setSettings({ showOnDesktop: v })} />
              </Row>
              <Row label="Always keep widgets on top" hint="Widgets float above every app window.">
                <Switch on={settings.alwaysOnTop} onChange={v => setSettings({ alwaysOnTop: v })} />
              </Row>
            </Group>
            <Group title="Editing">
              <Row label="Lock all widgets" hint="Prevents widgets from being moved or resized.">
                <Switch on={settings.lockAll} onChange={v => setSettings({ lockAll: v })} />
              </Row>
              <Row label="Show the + button in the corner">
                <Switch on={settings.showAddButton} onChange={v => setSettings({ showAddButton: v })} />
              </Row>
              <Row label="Edit widgets on the desktop" hint="Move, resize and remove widgets — just like “Edit Widgets” on a Mac.">
                <Button onClick={() => cmd?.({ type: 'edit-mode', value: true })}>Edit Widgets</Button>
                <Button kind="primary" onClick={() => cmd?.({ type: 'toggle-gallery', value: true })}>
                  Add Widgets…
                </Button>
              </Row>
            </Group>
            <Group>
              <Row label="Quit Widgets" hint="Widgets can be reopened from the Start menu shortcut or launcher.">
                <Button kind="danger" onClick={() => window.electronAPI?.closeApp()}>
                  Quit
                </Button>
              </Row>
            </Group>
          </>
        );

      case 'appearance':
        return (
          <>
            <Group title="Appearance">
              <div className="px-3.5 py-3 flex gap-4">
                {(['light', 'dark', 'auto'] as ThemeMode[]).map(t => (
                  <button key={t} onClick={() => setSettings({ theme: t })} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-[92px] h-[60px] rounded-lg overflow-hidden border-2 transition-all ${
                        settings.theme === t ? 'border-accent' : 'border-transparent'
                      }`}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          background:
                            t === 'light'
                              ? 'linear-gradient(135deg,#d9e6f5,#f5f5f7)'
                              : t === 'dark'
                              ? 'linear-gradient(135deg,#1c1c1e,#3a3a3c)'
                              : 'linear-gradient(135deg,#f5f5f7 50%,#1c1c1e 50%)'
                        }}
                      >
                        <div className={`m-2 w-8 h-8 rounded-md ${t === 'dark' ? 'bg-[#2c2c2e]' : 'bg-white'} shadow`} />
                      </div>
                    </div>
                    <span className="text-[12px] capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Widget style">
              <div className="px-3.5 py-3 flex gap-4">
                {(
                  [
                    { id: 'glass', label: 'Glass' },
                    { id: 'solid', label: 'Solid' },
                    { id: 'colorful', label: 'Colourful' }
                  ] as { id: WidgetStyle; label: string }[]
                ).map(o => (
                  <button key={o.id} onClick={() => setSettings({ style: o.id })} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-[92px] h-[60px] rounded-lg p-1.5 grid grid-cols-2 gap-1 border-2 transition-all bg-gradient-to-br from-[#9ec5f0] to-[#e5b5d8] ${
                        settings.style === o.id ? 'border-accent' : 'border-transparent'
                      }`}
                    >
                      {['#FFB36B', '#7FD1FF', '#8FE3A1', '#FF9EC7'].map(c => (
                        <div
                          key={c}
                          className="rounded"
                          style={{
                            background:
                              o.id === 'colorful'
                                ? c
                                : o.id === 'solid'
                                ? scheme === 'dark'
                                  ? '#1c1c1e'
                                  : '#fff'
                                : scheme === 'dark'
                                ? 'rgba(50,50,54,0.8)'
                                : 'rgba(255,255,255,0.75)'
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[12px]">{o.label}</span>
                  </button>
                ))}
              </div>
              <Row label="Background opacity">
                <Slider value={settings.opacity} min={0.3} max={1} step={0.02} onChange={v => setSettings({ opacity: v })} format={v => `${Math.round(v * 100)}%`} />
              </Row>
              <Row label="Corner radius">
                <Slider value={settings.radius} min={8} max={36} onChange={v => setSettings({ radius: v })} format={v => `${v}px`} />
              </Row>
              <Row label="Accent colour">
                <Swatches colors={ACCENT_SWATCHES} value={settings.accent} onChange={c => setSettings({ accent: c })} />
              </Row>
            </Group>

            <Group title="Preview">
              <div className="p-4 flex gap-3 items-start overflow-x-auto" style={{ background: 'linear-gradient(135deg,#6a8fd6,#c58fc4 60%,#f0b38a)' }}>
                <WidgetPreview type="analog-clock" size="small" scale={0.7} scheme={scheme} />
                <WidgetPreview type="calendar" size="small" scale={0.7} scheme={scheme} />
                <WidgetPreview type="system" size="medium" scale={0.7} scheme={scheme} />
              </div>
            </Group>
          </>
        );

      case 'layout':
        return (
          <>
            <Group title="Arrangement" footer="Widgets snap into place and are nudged apart when you drop one on top of another.">
              <Row label="Snap to grid">
                <Switch on={settings.snapToGrid} onChange={v => setSettings({ snapToGrid: v })} />
              </Row>
              <Row label="Grid size">
                <Slider value={settings.gridSize} min={5} max={40} onChange={v => setSettings({ gridSize: v })} format={v => `${v}px`} />
              </Row>
              <Row label="Space between widgets">
                <Slider value={settings.spacing} min={0} max={40} onChange={v => setSettings({ spacing: v })} format={v => `${v}px`} />
              </Row>
            </Group>
            <Group>
              <Row label="Tidy up" hint="Re-arrange every widget neatly from the top-left corner.">
                <Button onClick={() => cmd?.({ type: 'reset-layout' })}>Arrange Widgets</Button>
              </Row>
            </Group>
          </>
        );

      case 'widgets':
        return selected ? (
          <>
            <button onClick={() => setSelectedId(null)} className="text-[12.5px] text-accent mb-3 hover:underline">
              ‹ All Widgets
            </button>
            <div className="flex items-center gap-4 mb-5">
              <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg,#6a8fd6,#c58fc4 60%,#f0b38a)' }}>
                <WidgetPreview
                  type={selected.type}
                  size={selected.size}
                  scale={selected.size === 'xl' ? 0.35 : selected.size === 'small' ? 0.6 : 0.45}
                  scheme={scheme}
                  tint={selected.tint}
                  settings={selected.settings}
                />
              </div>
              <div>
                <div className="text-[20px] font-bold">{WIDGET_META[selected.type].title}</div>
                <div className="text-[12px] text-ink/50">{WIDGET_META[selected.type].description}</div>
              </div>
            </div>
            <WidgetEditor widget={selected} style={settings.style} />
          </>
        ) : (
          <>
            <Group
              title={`On your desktop (${widgets.length})`}
              footer="Tick two or more widgets to combine them into one Smart Stack. A Smart Stack can be split back into separate widgets at any time."
            >
              {widgets.length === 0 && <Row label="No widgets yet" hint="Add some from the widget gallery." />}
              {widgets.map(w => {
                const isStack = w.type === 'smart-stack';
                const inside = isStack ? (w.settings?.items || []).map((i: { type: WidgetType }) => WIDGET_META[i.type]?.title).join(' + ') : '';
                return (
                  <div key={w.id} className="flex items-center hover:bg-ink/[0.04]">
                    <div className="pl-3.5">
                      {isStack ? (
                        <span className="block w-4" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={picked.includes(w.id)}
                          onChange={e => setPicked(p => (e.target.checked ? [...p, w.id] : p.filter(x => x !== w.id)))}
                          className="w-4 h-4 accent-[rgb(var(--accent-rgb))] cursor-pointer"
                          title="Select to combine into a Smart Stack"
                        />
                      )}
                    </div>
                    <button onClick={() => setSelectedId(w.id)} className="flex-1 text-left min-w-0">
                      <Row
                        label={
                          <span className="flex items-center gap-2.5">
                            <span className="text-[17px]">{WIDGET_ICONS[w.type]}</span>
                            {WIDGET_META[w.type]?.title || w.type}
                          </span>
                        }
                        hint={isStack ? inside : undefined}
                      >
                        <span className="text-[12px] text-ink/50">
                          {SIZE_LABELS[w.size]}
                          {w.isLocked ? ' · Locked' : ''}
                        </span>
                        <span className="text-ink/30">›</span>
                      </Row>
                    </button>
                    {isStack && (
                      <div className="pr-3.5">
                        <Button onClick={() => splitStack(w.id)}>Split</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </Group>
            <div className="flex items-center gap-2">
              <Button kind="primary" onClick={() => cmd?.({ type: 'toggle-gallery', value: true })}>
                Add Widgets…
              </Button>
              <Button
                onClick={() => {
                  if (picked.length < 2) return;
                  stackWidgets(picked);
                  setPicked([]);
                }}
              >
                {picked.length >= 2 ? `Combine ${picked.length} into Smart Stack` : 'Combine into Smart Stack (tick 2+)'}
              </Button>
            </div>
          </>
        );

      case 'about':
        return (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-[22px] bg-gradient-to-br from-[#5ac8fa] to-[#5856d6] shadow-xl mb-4">
              {['#fff', '#ffffffcc', '#ffffffcc', '#fff'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-lg" style={{ background: c }} />
              ))}
            </div>
            <div className="text-[22px] font-bold">Desktop Widgets</div>
            <div className="text-[12px] text-ink/50 mb-5">Version 2.0 · macOS-style widgets for Windows</div>
            <Group>
              <Row label="Widgets on desktop">
                <span className="text-[12.5px] text-ink/60">{widgets.length}</span>
              </Row>
              <Row label="Weather data">
                <span className="text-[12.5px] text-ink/60">Open-Meteo.com</span>
              </Row>
              <Row label="Settings file">
                <span className="text-[12px] text-ink/60">%APPDATA%\mac-widgets-windows\widgets-config.json</span>
              </Row>
            </Group>
          </div>
        );
    }
  };

  const filteredSections = SECTIONS.filter(s => !filter || s.label.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className={`fixed inset-0 flex font-apple text-[13px] scheme-${scheme} ${scheme === 'dark' ? 'bg-[#1e1e20]' : 'bg-[#f5f5f7]'}`}
      style={{ ...rootVars, ...vars, color: 'rgb(var(--ink))' }}
    >
      {/* Sidebar */}
      <aside className={`w-[230px] flex-shrink-0 flex flex-col border-r border-ink/10 ${scheme === 'dark' ? 'bg-[#2a2a2d]' : 'bg-[#e8e8ed]'}`}>
        <div className="h-[52px] px-4 flex items-center titlebar-drag">
          <TrafficLights />
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search"
              className="w-full h-7 pl-7 pr-2 rounded-md bg-ink/[0.07] text-[12.5px] placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>
        <nav className="px-2 space-y-0.5">
          {filteredSections.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSection(s.id);
                if (s.id !== 'widgets') setSelectedId(null);
              }}
              className={`w-full h-8 px-2 rounded-md flex items-center gap-2.5 text-[13px] transition-colors ${
                section === s.id ? 'bg-accent text-white' : 'hover:bg-ink/[0.06]'
              }`}
            >
              <span className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-white shadow-sm" style={{ background: s.color }}>
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[52px] flex-shrink-0 px-7 flex items-center titlebar-drag border-b border-ink/[0.06]">
          <h1 className="text-[15px] font-bold">{SECTIONS.find(s => s.id === section)?.label}</h1>
        </header>
        <div className="flex-1 overflow-y-auto settings-scroll px-7 py-5">
          <div className="max-w-[640px] mx-auto">{loaded ? content() : null}</div>
        </div>
      </main>
    </div>
  );
};
