import React, { useCallback, useEffect, useState } from 'react';
import { WidgetInstance, WIDGET_DIMENSIONS } from '../types/widget';
import { useDraggable } from '../hooks/useDraggable';
import { useResizable } from '../hooks/useResizable';
import { useWidgetStore } from '../hooks/useWidgetStore';
import { WIDGET_META, defaultSettingsFor } from '../widgets/defaults';
import { WIDGET_COMPONENTS } from '../widgets/registry';
import { Minus, Lock } from 'lucide-react';

interface WidgetContainerProps {
  widget: WidgetInstance;
  scheme: 'dark' | 'light';
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({ widget, scheme }) => {
  const openContextMenu = useWidgetStore(s => s.openContextMenu);
  const removeWidget = useWidgetStore(s => s.removeWidget);
  const updateSettings = useWidgetStore(s => s.updateSettings);
  const style = useWidgetStore(s => s.settings.style);
  const opacity = useWidgetStore(s => s.settings.opacity);
  const lockAll = useWidgetStore(s => s.settings.lockAll);
  const editMode = useWidgetStore(s => s.editMode);

  const meta = WIDGET_META[widget.type];
  const size = meta && meta.sizes.includes(widget.size) ? widget.size : meta?.defaultSize || 'small';
  const dims = WIDGET_DIMENSIONS[size];
  const locked = !!widget.isLocked || lockAll;

  const { x, y, isDragging, dropPreview, handlers } = useDraggable({
    id: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    size,
    width: dims.width,
    height: dims.height,
    disabled: locked
  });

  const { ghost, handleProps } = useResizable(widget.id, size, meta?.sizes || [size], locked);

  // Scale-in only for freshly added widgets
  const [entering, setEntering] = useState(() => Date.now() - Number(widget.id.split('-').pop()) < 2000);
  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), 400);
    return () => clearTimeout(t);
  }, [entering]);

  const onSettings = useCallback((patch: Record<string, any>) => updateSettings(widget.id, patch), [updateSettings, widget.id]);

  const Comp = WIDGET_COMPONENTS[widget.type];
  if (!Comp || !meta) return null;

  const settings = { ...defaultSettingsFor(widget.type), ...(widget.settings || {}) };
  const tint = widget.tint || meta.tint;

  // Colourful pastel backgrounds want dark text in light mode – handled by the scheme class
  const surfaceClass = `style-${style} scheme-${scheme}`;

  return (
    <>
      {dropPreview && (dropPreview.x !== Math.round(x) || dropPreview.y !== Math.round(y)) && (
        <div
          className="drop-ghost"
          style={{ transform: `translate3d(${dropPreview.x}px, ${dropPreview.y}px, 0)`, width: dims.width, height: dims.height }}
        />
      )}

      <div
        {...handlers}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          openContextMenu(widget.id, e.clientX, e.clientY);
        }}
        data-widget-id={widget.id}
        style={{
          transform: `translate3d(${x}px, ${y}px, 0)`,
          width: dims.width,
          height: dims.height,
          ['--tint' as any]: tint,
          cursor: isDragging ? 'grabbing' : undefined,
          touchAction: 'none'
        }}
        className={`widget-shell ${surfaceClass} ${isDragging ? 'is-dragging' : 'z-10'} ${entering ? 'is-entering' : ''} ${
          editMode ? 'edit-mode' : ''
        }`}
      >
        <div className={`widget-clip ${surfaceClass} ${meta.fullBleed ? 'full-bleed' : ''}`}>
          {!meta.fullBleed && <div className="widget-bg" style={{ opacity }} />}
          <Comp id={widget.id} size={size} settings={settings} onSettings={onSettings} />
        </div>

        {/* macOS edit-mode remove badge */}
        {editMode && (
          <button
            onClick={e => {
              e.stopPropagation();
              removeWidget(widget.id);
            }}
            onPointerDown={e => e.stopPropagation()}
            title="Remove widget"
            className="remove-badge no-drag"
          >
            <Minus size={14} strokeWidth={3} />
          </button>
        )}

        {/* Corner resize handle (snaps to supported sizes) */}
        {!locked && meta.sizes.length > 1 && <div {...handleProps} className="resize-handle no-drag" title="Drag to resize" />}

        {locked && editMode && (
          <div className="absolute top-2 right-2 text-ink/40 pointer-events-none z-20">
            <Lock size={12} />
          </div>
        )}
      </div>

      {ghost && ghost !== size && (
        <div
          className="resize-ghost"
          style={{
            transform: `translate3d(${x}px, ${y}px, 0)`,
            width: WIDGET_DIMENSIONS[ghost].width,
            height: WIDGET_DIMENSIONS[ghost].height
          }}
        />
      )}
    </>
  );
};
