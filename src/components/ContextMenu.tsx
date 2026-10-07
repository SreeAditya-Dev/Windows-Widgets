import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWidgetStore } from '../hooks/useWidgetStore';
import { SIZE_LABELS } from '../types/widget';
import { WIDGET_META, TINT_SWATCHES } from '../widgets/defaults';
import { choosePhotos } from '../widgets/shared';
import { Trash2, Lock, Unlock, Layers, Check, Settings, SquarePen, FolderOpen, Image as ImageIcon, SplitSquareVertical, SlidersHorizontal } from 'lucide-react';

const Item: React.FC<{
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  checked?: boolean;
  children: React.ReactNode;
}> = ({ icon, onClick, danger, checked, children }) => (
  <button
    onClick={onClick}
    className={`w-full h-[26px] px-2 rounded-[6px] flex items-center gap-2 text-left transition-colors ${
      danger ? 'text-[#FF453A] hover:bg-[#FF453A] hover:text-white' : 'hover:bg-accent hover:text-white'
    }`}
  >
    <span className="w-4 flex justify-center opacity-80">{checked ? <Check size={13} strokeWidth={3} /> : icon}</span>
    <span className="flex-1">{children}</span>
  </button>
);

const Sep = () => <div className="h-px bg-ink/10 my-1 mx-2" />;

export const ContextMenu: React.FC = () => {
  const contextMenu = useWidgetStore(s => s.contextMenu);
  const widgets = useWidgetStore(s => s.widgets);
  const style = useWidgetStore(s => s.settings.style);
  const closeContextMenu = useWidgetStore(s => s.closeContextMenu);
  const updateSize = useWidgetStore(s => s.updateSize);
  const updateWidget = useWidgetStore(s => s.updateWidget);
  const removeWidget = useWidgetStore(s => s.removeWidget);
  const createStack = useWidgetStore(s => s.createStack);
  const splitStack = useWidgetStore(s => s.splitStack);
  const setWidgetLocked = useWidgetStore(s => s.setWidgetLocked);
  const setEditMode = useWidgetStore(s => s.setEditMode);
  const updateSettings = useWidgetStore(s => s.updateSettings);

  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const widget = widgets.find(w => w.id === contextMenu.widgetId);

  useEffect(() => {
    if (!contextMenu.isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeContextMenu();
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [contextMenu.isOpen, closeContextMenu]);

  // Keep the menu on-screen using its real size
  useLayoutEffect(() => {
    if (!contextMenu.isOpen || !menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(contextMenu.x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(contextMenu.y, window.innerHeight - r.height - 8))
    });
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

  if (!contextMenu.isOpen || !widget) return null;
  const meta = WIDGET_META[widget.type];

  const run = (fn: () => void) => () => {
    fn();
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 w-[220px] rounded-[10px] p-[5px] apple-glass-panel text-[13px] animate-scale-in no-drag select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {meta.sizes.map(sz => (
        <Item key={sz} checked={widget.size === sz} onClick={run(() => updateSize(widget.id, sz))}>
          {SIZE_LABELS[sz]}
        </Item>
      ))}

      <Sep />

      {style === 'colorful' && (
        <>
          <div className="px-2 pt-1 pb-1.5 flex flex-wrap gap-1.5">
            {TINT_SWATCHES.map(c => (
              <button
                key={c}
                title={c}
                onClick={() => updateWidget(widget.id, { tint: c })}
                className={`w-[18px] h-[18px] rounded-full border border-black/10 transition-transform hover:scale-110 ${
                  (widget.tint || meta.tint) === c ? 'ring-2 ring-accent ring-offset-1 ring-offset-transparent' : ''
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <Sep />
        </>
      )}

      {widget.type === 'photos' && (
        <>
          <Item
            icon={<ImageIcon size={13} />}
            onClick={run(async () => {
              const patch = await choosePhotos('photo');
              if (patch) updateSettings(widget.id, patch);
            })}
          >
            Choose Photo…
          </Item>
          <Item
            icon={<FolderOpen size={13} />}
            onClick={run(async () => {
              const patch = await choosePhotos('folder');
              if (patch) updateSettings(widget.id, patch);
            })}
          >
            Choose Photo Folder…
          </Item>
        </>
      )}
      <Item icon={<Settings size={13} />} onClick={run(() => window.electronAPI?.openSettings(`widget:${widget.id}`))}>
        Edit “{meta.title}”…
      </Item>
      <Item icon={<SquarePen size={13} />} onClick={run(() => setEditMode(true))}>
        Edit Widgets
      </Item>
      {widget.type === 'smart-stack' ? (
        <Item icon={<SplitSquareVertical size={13} />} onClick={run(() => splitStack(widget.id))}>
          Split into Separate Widgets
        </Item>
      ) : (
        <Item icon={<Layers size={13} />} onClick={run(() => createStack(widget.id))}>
          Make Smart Stack
        </Item>
      )}
      <Item
        icon={widget.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
        onClick={run(() => setWidgetLocked(widget.id, !widget.isLocked))}
      >
        {widget.isLocked ? 'Unlock Position' : 'Lock Position'}
      </Item>

      <Sep />
      <Item icon={<SlidersHorizontal size={13} />} onClick={run(() => window.electronAPI?.openSettings())}>
        Widget Settings…
      </Item>
      <Sep />
      <Item danger icon={<Trash2 size={13} />} onClick={run(() => removeWidget(widget.id))}>
        Remove Widget
      </Item>
    </div>
  );
};
