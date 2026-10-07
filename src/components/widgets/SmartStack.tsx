import React, { useEffect, useRef, useState } from 'react';
import { SmartStackSettings, SmartStackItem } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';
import { WIDGET_META, defaultSettingsFor } from '../../widgets/defaults';
import { WIDGET_COMPONENTS } from '../../widgets/registry';

const FALLBACK: SmartStackItem[] = [
  { id: 'item-clock', type: 'analog-clock', title: 'Clock' },
  { id: 'item-date', type: 'date', title: 'Date' },
  { id: 'item-weather', type: 'weather', title: 'Weather' }
];

export const SmartStack: React.FC<WidgetProps<SmartStackSettings>> = ({ id, size, settings, onSettings, preview }) => {
  const items = settings?.items?.length ? settings.items : FALLBACK;
  const total = items.length;
  const [index, setIndex] = useState(Math.min(settings?.currentIndex || 0, total - 1));
  const [flip, setFlip] = useState<'flip-up' | 'flip-down' | ''>('');
  const lastScroll = useRef(0);

  useEffect(() => {
    if (!settings?.autoRotate || total <= 1) return;
    const t = setInterval(() => go(index + 1, 'flip-up'), (settings.rotateIntervalSeconds || 30) * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.autoRotate, settings?.rotateIntervalSeconds, index, total]);

  const go = (next: number, dir: 'flip-up' | 'flip-down') => {
    if (flip || total <= 1) return;
    const target = (next + total) % total;
    setFlip(dir);
    setTimeout(() => {
      setIndex(target);
      setFlip('');
      if (!preview) onSettings({ currentIndex: target });
    }, 160);
  };

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScroll.current < 450 || Math.abs(e.deltaY) < 4) return;
    lastScroll.current = now;
    go(index + (e.deltaY > 0 ? 1 : -1), e.deltaY > 0 ? 'flip-up' : 'flip-down');
  };

  const item = items[index % total];
  const Comp = WIDGET_COMPONENTS[item.type];
  const itemSettings = { ...defaultSettingsFor(item.type), ...(item.settings || {}) };
  const itemSize = WIDGET_META[item.type].sizes.includes(size) ? size : WIDGET_META[item.type].sizes[0];

  const updateItem = (patch: Record<string, any>) => {
    if (preview) return;
    onSettings({
      items: items.map(it => (it.id === item.id ? { ...it, settings: { ...(it.settings || {}), ...patch } } : it))
    });
  };

  return (
    <div onWheel={onWheel} className="relative w-full h-full overflow-hidden">
      <div className={`stack-card w-full h-full ${flip}`}>
        {Comp && <Comp id={`${id}-${item.id}`} size={itemSize} settings={itemSettings} onSettings={updateItem} preview={preview} />}
      </div>

      {total > 1 && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 no-drag">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={e => {
                e.stopPropagation();
                if (i !== index) go(i, i > index ? 'flip-up' : 'flip-down');
              }}
              title={it.title}
              className={`w-[5px] rounded-full transition-all duration-300 ${
                i === index ? 'h-3 bg-ink/80' : 'h-[5px] bg-ink/30 hover:bg-ink/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
