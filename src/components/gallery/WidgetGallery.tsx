import React, { useMemo, useState } from 'react';
import { useWidgetStore } from '../../hooks/useWidgetStore';
import { useResolvedScheme } from '../../hooks/useAppearance';
import { WidgetType, WidgetSize, SIZE_LABELS } from '../../types/widget';
import { WIDGET_META, WIDGET_ORDER, WidgetMeta } from '../../widgets/defaults';
import { WIDGET_ICONS } from '../../widgets/registry';
import { WidgetPreview } from '../WidgetPreview';
import { Search, Settings, Plus } from 'lucide-react';

const CATEGORIES: ('All' | WidgetMeta['category'])[] = ['All', 'Clocks', 'Productivity', 'Utilities', 'System', 'Photos', 'Featured'];

const PREVIEW_SCALE: Record<WidgetSize, number> = { small: 0.62, medium: 0.62, large: 0.62, xl: 0.5 };

export const WidgetGallery: React.FC = () => {
  const isGalleryOpen = useWidgetStore(s => s.isGalleryOpen);
  const toggleGallery = useWidgetStore(s => s.toggleGallery);
  const addWidget = useWidgetStore(s => s.addWidget);
  const scheme = useResolvedScheme();

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const list = useMemo(
    () =>
      WIDGET_ORDER.map(t => WIDGET_META[t]).filter(m => {
        const q = query.trim().toLowerCase();
        const matchQ = !q || m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
        return matchQ && (category === 'All' || m.category === category);
      }),
    [category, query]
  );

  if (!isGalleryOpen) return null;

  const add = (type: WidgetType, size: WidgetSize) => {
    addWidget(type, size);
    setJustAdded(`${type}:${size}`);
    setTimeout(() => setJustAdded(null), 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 animate-fade-in no-drag interactive-control"
      onMouseDown={e => e.target === e.currentTarget && toggleGallery(false)}
    >
      <div className="w-[min(980px,92vw)] h-[min(640px,88vh)] rounded-[18px] apple-glass-panel flex overflow-hidden animate-scale-in">
        {/* Sidebar */}
        <div className="w-[210px] flex-shrink-0 border-r border-ink/10 p-3 flex flex-col bg-ink/[0.03]">
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Widgets"
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-ink/[0.07] text-[13px] placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
          <div className="space-y-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`w-full h-8 px-3 rounded-lg text-left text-[13px] font-medium transition-colors ${
                  category === cat ? 'bg-accent text-white' : 'hover:bg-ink/[0.07]'
                }`}
              >
                {cat === 'All' ? 'All Widgets' : cat}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-3 border-t border-ink/10">
            <button
              onClick={() => window.electronAPI?.openSettings()}
              className="w-full h-8 px-3 rounded-lg text-left text-[13px] font-medium hover:bg-ink/[0.07] flex items-center gap-2"
            >
              <Settings size={14} /> Widget Settings…
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 px-6 flex items-center justify-between border-b border-ink/10 flex-shrink-0">
            <div>
              <div className="text-[17px] font-bold">{category === 'All' ? 'Widgets' : category}</div>
              <div className="text-[11px] text-ink/50 -mt-0.5">Click a size to add it to your desktop</div>
            </div>
            <button
              onClick={() => toggleGallery(false)}
              className="h-8 px-5 rounded-full bg-accent text-white text-[13px] font-semibold hover:brightness-110 active:scale-95 transition"
            >
              Done
            </button>
          </div>

          <div className="flex-1 overflow-y-auto settings-scroll px-6 py-5 space-y-7">
            {list.length === 0 && <div className="text-center text-ink/50 text-[13px] mt-20">No widgets match “{query}”</div>}
            {list.map(meta => (
              <section key={meta.type}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[18px]">{WIDGET_ICONS[meta.type]}</span>
                  <h3 className="text-[15px] font-semibold">{meta.title}</h3>
                </div>
                <p className="text-[12px] text-ink/55 mb-3">{meta.description}</p>
                <div className="flex items-end gap-5 overflow-x-auto no-scrollbar pb-1">
                  {meta.sizes.map(sz => {
                    const added = justAdded === `${meta.type}:${sz}`;
                    return (
                      <button key={sz} onClick={() => add(meta.type, sz)} className="group flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="relative rounded-[16px] transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98]">
                          <WidgetPreview type={meta.type} size={sz} scale={PREVIEW_SCALE[sz]} scheme={scheme} />
                          <div
                            className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-all ${
                              added ? 'bg-[#34C759] scale-110' : 'bg-accent opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Plus size={14} strokeWidth={3} />
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-ink/60">{added ? 'Added ✓' : SIZE_LABELS[sz]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
