import React, { useEffect, useRef } from 'react';
import { useWidgetStore } from '../hooks/useWidgetStore';
import { useResolvedScheme, useRootVars } from '../hooks/useAppearance';
import { WidgetContainer } from './WidgetContainer';
import { ContextMenu } from './ContextMenu';
import { WidgetGallery } from './gallery/WidgetGallery';
import { Plus } from 'lucide-react';

const INTERACTIVE_SELECTOR = '.widget-shell, .interactive-control, .apple-glass-panel, .resize-ghost';
const EDITABLE_SELECTOR = 'input, textarea, [contenteditable="true"]';

export const Canvas: React.FC = () => {
  const widgets = useWidgetStore(s => s.widgets);
  const isGalleryOpen = useWidgetStore(s => s.isGalleryOpen);
  const toggleGallery = useWidgetStore(s => s.toggleGallery);
  const contextMenu = useWidgetStore(s => s.contextMenu);
  const activeDragId = useWidgetStore(s => s.activeDragId);
  const editMode = useWidgetStore(s => s.editMode);
  const setEditMode = useWidgetStore(s => s.setEditMode);
  const showAddButton = useWidgetStore(s => s.settings.showAddButton);
  const scheme = useResolvedScheme();
  const rootVars = useRootVars();

  const overlayOpen = isGalleryOpen || editMode || contextMenu.isOpen;
  const forceInteractive = overlayOpen || !!activeDragId;
  const isInteractiveRef = useRef<boolean | null>(null);

  // Tell the main process when overlay UI is open so the layer stays above apps
  useEffect(() => {
    window.electronAPI?.setOverlayActive(overlayOpen);
    if (isGalleryOpen) window.electronAPI?.requestFocus();
  }, [overlayOpen, isGalleryOpen]);

  // Mouse pass-through: only capture the mouse while it is over a widget / panel
  useEffect(() => {
    const setInteractive = (on: boolean) => {
      if (isInteractiveRef.current === on) return;
      isInteractiveRef.current = on;
      if (on) window.electronAPI?.setIgnoreMouseEvents(false);
      else window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
    };

    if (forceInteractive) setInteractive(true);

    const handleMove = (e: MouseEvent) => {
      if (forceInteractive) return setInteractive(true);
      const target = document.elementFromPoint(e.clientX, e.clientY);
      setInteractive(!!target?.closest(INTERACTIVE_SELECTOR));
    };

    // Leaving the window entirely → click-through again
    const handleLeave = () => !forceInteractive && setInteractive(false);

    window.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [forceInteractive]);

  // Typing into a widget needs real keyboard focus
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.(EDITABLE_SELECTOR)) window.electronAPI?.requestFocus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useWidgetStore.getState();
      if (st.contextMenu.isOpen) st.closeContextMenu();
      else if (st.isGalleryOpen) st.toggleGallery(false);
      else if (st.editMode) st.setEditMode(false);
      (document.activeElement as HTMLElement)?.blur?.();
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none font-apple scheme-${scheme}`}
      style={{ backgroundColor: 'transparent', ...rootVars }}
    >
      {/* Edit mode: dim the desktop slightly, clicking empty space finishes editing */}
      {editMode && !isGalleryOpen && (
        <div className="absolute inset-0 bg-black/15 interactive-control animate-fade-in" onClick={() => setEditMode(false)} />
      )}

      {widgets.map(w => (
        <WidgetContainer key={w.id} widget={w} scheme={scheme} />
      ))}

      {editMode && !isGalleryOpen && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 interactive-control animate-scale-in">
          <button
            onClick={() => toggleGallery(true)}
            className="h-9 px-4 rounded-full apple-glass-panel text-[13px] font-semibold flex items-center gap-1.5 hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.6} /> Add Widgets
          </button>
          <button
            onClick={() => setEditMode(false)}
            className="h-9 px-5 rounded-full bg-accent text-white text-[13px] font-semibold shadow-lg hover:brightness-110"
          >
            Done
          </button>
        </div>
      )}

      {showAddButton && !editMode && !isGalleryOpen && (
        <div className="fixed bottom-6 right-6 z-30 interactive-control">
          <button
            onClick={() => toggleGallery(true)}
            onContextMenu={e => {
              e.preventDefault();
              window.electronAPI?.openSettings();
            }}
            title="Add Widgets (right-click for Settings)"
            className="w-11 h-11 rounded-full apple-glass-panel flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.45)] border border-white/25 hover:border-white/40 hover:scale-110 active:scale-95 transition-all text-white bg-black/40 hover:bg-black/60 backdrop-blur-xl"
          >
            <Plus size={20} strokeWidth={2.5} className="drop-shadow" />
          </button>
        </div>
      )}

      <ContextMenu />
      <WidgetGallery />
    </div>
  );
};
