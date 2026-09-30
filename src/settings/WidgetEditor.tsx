import React, { useEffect, useMemo, useState } from 'react';
import { WidgetInstance, SIZE_LABELS, WidgetType, SmartStackItem } from '../types/widget';
import { WIDGET_META, WIDGET_ORDER, TINT_SWATCHES, defaultSettingsFor } from '../widgets/defaults';
import { searchCity, GeoResult } from '../widgets/weatherApi';
import { useWidgetStore } from '../hooks/useWidgetStore';
import { Group, Row, Switch, Segmented, Slider, Swatches, Button, TextInput, Select } from './controls';
import { Trash2, Plus, X } from 'lucide-react';

const ZONES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf('timeZone') as string[];
  } catch {
    return ['UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
  }
})();

const zoneOptions = (withLocal: boolean) => [
  ...(withLocal ? [{ value: '', label: 'Local time' }] : []),
  ...ZONES.map(z => ({ value: z, label: z.replace(/_/g, ' ') }))
];

const cityFromZone = (z: string) => z.split('/').pop()!.replace(/_/g, ' ');

const CitySearch: React.FC<{ onPick: (g: GeoResult) => void }> = ({ onPick }) => {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<GeoResult[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes([]);
      setErr('');
      return;
    }
    const t = setTimeout(
      () =>
        searchCity(q)
          .then(r => {
            setRes(r);
            setErr(r.length ? '' : 'No matching cities');
          })
          .catch(() => setErr('Could not reach the weather service')),
      300
    );
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="w-full">
      <TextInput value={q} onChange={setQ} placeholder="Search for a city…" className="w-full" />
      {(res.length > 0 || err) && (
        <div className="mt-1.5 rounded-md border border-ink/10 overflow-hidden">
          {res.map(r => (
            <button
              key={`${r.latitude},${r.longitude}`}
              onClick={() => {
                onPick(r);
                setQ('');
              }}
              className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-accent hover:text-white"
            >
              <b className="font-semibold">{r.name}</b>
              <span className="opacity-70">{[r.admin1, r.country].filter(Boolean).length ? `, ${[r.admin1, r.country].filter(Boolean).join(', ')}` : ''}</span>
            </button>
          ))}
          {err && <div className="px-3 py-1.5 text-[12px] text-ink/50">{err}</div>}
        </div>
      )}
    </div>
  );
};

export const WidgetEditor: React.FC<{ widget: WidgetInstance; style: string }> = ({ widget, style }) => {
  const updateSettings = useWidgetStore(s => s.updateSettings);
  const updateWidget = useWidgetStore(s => s.updateWidget);
  const updateSize = useWidgetStore(s => s.updateSize);
  const removeWidget = useWidgetStore(s => s.removeWidget);
  const splitStack = useWidgetStore(s => s.splitStack);
  const unstackItem = useWidgetStore(s => s.unstackItem);
  const meta = WIDGET_META[widget.type];
  const s = useMemo(() => ({ ...defaultSettingsFor(widget.type), ...(widget.settings || {}) }), [widget.type, widget.settings]);
  const set = (patch: Record<string, any>) => updateSettings(widget.id, patch);

  return (
    <div>
      <Group title="Widget">
        <Row label="Size">
          <Segmented
            value={widget.size}
            options={meta.sizes.map(sz => ({ value: sz, label: SIZE_LABELS[sz] }))}
            onChange={sz => updateSize(widget.id, sz)}
          />
        </Row>
        <Row label="Colour" hint={style === 'colorful' ? undefined : 'Used by the Colourful widget style (Appearance).'}>
          <Swatches colors={TINT_SWATCHES} value={widget.tint || meta.tint} onChange={c => updateWidget(widget.id, { tint: c })} size={18} />
        </Row>
        <Row label="Lock position" hint="Locked widgets can’t be dragged or resized.">
          <Switch on={!!widget.isLocked} onChange={v => updateWidget(widget.id, { isLocked: v })} />
        </Row>
      </Group>

      {(widget.type === 'analog-clock' || widget.type === 'flip-clock') && (
        <Group title="Clock">
          <Row label="Time zone">
            <Select value={s.timeZone || ''} onChange={v => set({ timeZone: v || undefined, label: v ? cityFromZone(v) : undefined })} options={zoneOptions(true)} />
          </Row>
          {widget.type === 'analog-clock' && (
            <Row label="City label">
              <TextInput value={s.label || ''} onChange={v => set({ label: v })} placeholder="Local" />
            </Row>
          )}
          <Row label="24-hour time">
            <Switch on={!!s.use24h} onChange={v => set({ use24h: v })} />
          </Row>
          <Row label="Show seconds">
            <Switch on={s.showSeconds !== false} onChange={v => set({ showSeconds: v })} />
          </Row>
        </Group>
      )}

      {widget.type === 'world-clock' && (
        <Group title="Cities" footer="Up to four cities are shown.">
          {(s.zones as { timeZone: string; label: string }[]).map((z, i) => (
            <Row key={i} label={`City ${i + 1}`}>
              <TextInput
                value={z.label}
                onChange={v => set({ zones: s.zones.map((x: any, j: number) => (j === i ? { ...x, label: v } : x)) })}
                className="w-[130px]"
              />
              <Select
                value={z.timeZone}
                onChange={v => set({ zones: s.zones.map((x: any, j: number) => (j === i ? { timeZone: v, label: cityFromZone(v) } : x)) })}
                options={zoneOptions(false)}
                className="w-[190px]"
              />
              <button onClick={() => set({ zones: s.zones.filter((_: any, j: number) => j !== i) })} className="text-ink/40 hover:text-[#FF3B30]">
                <X size={15} />
              </button>
            </Row>
          ))}
          {s.zones.length < 4 && (
            <Row label="">
              <Button onClick={() => set({ zones: [...s.zones, { timeZone: 'Asia/Kolkata', label: 'Kolkata' }] })}>
                <span className="flex items-center gap-1">
                  <Plus size={13} /> Add City
                </span>
              </Button>
            </Row>
          )}
          <Row label="24-hour time">
            <Switch on={!!s.use24h} onChange={v => set({ use24h: v })} />
          </Row>
        </Group>
      )}

      {widget.type === 'calendar' && (
        <Group title="Calendar">
          <Row label="Week starts on">
            <Segmented value={s.firstDayOfWeek} options={[{ value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }]} onChange={v => set({ firstDayOfWeek: v })} />
          </Row>
        </Group>
      )}

      {widget.type === 'weather' && (
        <Group title="Weather" footer="Forecast data by Open-Meteo.com — no account needed.">
          <Row label="Location" hint={s.city ? `Currently: ${s.city}` : 'No city chosen yet'} stacked>
            <CitySearch onPick={g => set({ city: g.name, latitude: g.latitude, longitude: g.longitude })} />
          </Row>
          <Row label="Units">
            <Segmented value={s.unit} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} onChange={v => set({ unit: v })} />
          </Row>
        </Group>
      )}

      {widget.type === 'todo' && (
        <Group title="Reminders">
          <Row label="List name">
            <TextInput value={s.title || ''} onChange={v => set({ title: v })} />
          </Row>
          <Row label="Clear completed" hint={`${(s.items || []).filter((i: any) => i.done).length} completed items`}>
            <Button onClick={() => set({ items: (s.items || []).filter((i: any) => !i.done) })}>Clear</Button>
          </Row>
        </Group>
      )}

      {widget.type === 'notes' && (
        <Group title="Note">
          <Row label="Text" stacked>
            <textarea
              value={s.text || ''}
              onChange={e => set({ text: e.target.value })}
              rows={5}
              className="w-full p-2.5 rounded-md bg-[var(--btn)] border border-ink/[0.12] text-[13px] outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </Row>
        </Group>
      )}

      {widget.type === 'timer' && (
        <Group title="Timer">
          <Row label="Default duration">
            <Select
              value={String(s.defaultDurationSeconds)}
              onChange={v => set({ defaultDurationSeconds: parseInt(v, 10) })}
              options={[60, 180, 300, 600, 900, 1500, 1800, 3600].map(n => ({ value: String(n), label: `${n / 60} minutes` }))}
            />
          </Row>
          <Row label="Play sound when finished">
            <Switch on={s.soundEnabled !== false} onChange={v => set({ soundEnabled: v })} />
          </Row>
          <Row label="Volume">
            <Slider value={s.soundVolume ?? 0.8} min={0} max={1} step={0.05} onChange={v => set({ soundVolume: v })} format={v => `${Math.round(v * 100)}%`} />
          </Row>
        </Group>
      )}

      {widget.type === 'photos' && (
        <Group title="Photos">
          <Row label="Photo folder" hint={s.customImages?.length ? `${s.customImages.length} photos selected` : 'Showing sample photos'}>
            <Button
              onClick={async () => {
                const imgs = await window.electronAPI?.openDirectoryDialog();
                if (imgs && imgs.length) set({ customImages: imgs });
              }}
            >
              Choose Folder…
            </Button>
          </Row>
          <Row label="Change photo every">
            <Slider value={s.cycleIntervalSeconds} min={5} max={120} step={5} onChange={v => set({ cycleIntervalSeconds: v })} format={v => `${v}s`} />
          </Row>
          <Row label="Motion">
            <Segmented value={s.effect === 'static' ? 'static' : 'ken-burns'} options={[{ value: 'ken-burns', label: 'Ken Burns' }, { value: 'static', label: 'Still' }]} onChange={v => set({ effect: v })} />
          </Row>
        </Group>
      )}

      {widget.type === 'smart-stack' && (
        <Group title="Smart Stack" footer="Scroll over the stack on your desktop to flip between widgets.">
          <Row label="Keep these widgets separate instead" hint="Puts every widget in this stack on the desktop on its own.">
            <Button kind="primary" onClick={() => splitStack(widget.id)}>
              Split into Separate Widgets
            </Button>
          </Row>
          {(s.items as SmartStackItem[]).map((it, i) => (
            <Row key={it.id} label={`${i + 1}. ${WIDGET_META[it.type].title}`}>
              <Button onClick={() => unstackItem(widget.id, it.id)}>Move Out</Button>
              <button
                disabled={s.items.length <= 1}
                title="Remove from stack"
                onClick={() => set({ items: s.items.filter((x: SmartStackItem) => x.id !== it.id), currentIndex: 0 })}
                className="text-ink/40 hover:text-[#FF3B30] disabled:opacity-30"
              >
                <X size={15} />
              </button>
            </Row>
          ))}
          <Row label="Add widget to stack">
            <Select
              value=""
              onChange={v => {
                if (!v) return;
                const t = v as Exclude<WidgetType, 'smart-stack'>;
                set({ items: [...s.items, { id: Math.random().toString(36).slice(2, 9), type: t, title: WIDGET_META[t].title, settings: defaultSettingsFor(t) }] });
              }}
              options={[{ value: '', label: 'Choose…' }, ...WIDGET_ORDER.filter(t => t !== 'smart-stack').map(t => ({ value: t, label: WIDGET_META[t].title }))]}
            />
          </Row>
          <Row label="Rotate automatically">
            <Switch on={!!s.autoRotate} onChange={v => set({ autoRotate: v })} />
          </Row>
          {s.autoRotate && (
            <Row label="Rotate every">
              <Slider value={s.rotateIntervalSeconds} min={5} max={120} step={5} onChange={v => set({ rotateIntervalSeconds: v })} format={v => `${v}s`} />
            </Row>
          )}
        </Group>
      )}

      <Group>
        <Row label="Remove this widget from the desktop">
          <Button kind="danger" onClick={() => removeWidget(widget.id)}>
            <span className="flex items-center gap-1.5">
              <Trash2 size={13} /> Remove
            </span>
          </Button>
        </Row>
      </Group>
    </div>
  );
};
