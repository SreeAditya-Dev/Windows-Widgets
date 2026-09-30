import { useState, useRef, useEffect, useCallback } from 'react';
import { useWidgetStore } from './useWidgetStore';
import { findFreeSpot, clampToBounds } from '../lib/layout';
import { WidgetSize } from '../types/widget';

interface DragOptions {
  id: string;
  x: number;
  y: number;
  size: WidgetSize;
  width: number;
  height: number;
  disabled?: boolean;
}

const DRAG_THRESHOLD = 4;
const INTERACTIVE = 'button, input, textarea, select, a, [contenteditable="true"], .no-drag';

/**
 * macOS-style widget dragging built on Pointer Events.
 * - Move/up are tracked on the window, so even a very fast flick that leaves the
 *   widget before the first move event still drags it.
 * - A drag only starts after the pointer moves a few pixels, so clicks inside widgets still work.
 * - On release the widget snaps to the grid and is nudged away from any widget it overlaps.
 */
export function useDraggable({ id, x, y, size, width, height, disabled = false }: DragOptions) {
  const [pos, setPos] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number } | null>(null);

  const updatePosition = useWidgetStore(s => s.updatePosition);
  const setDragActive = useWidgetStore(s => s.setDragActive);

  const live = useRef({ x, y });
  const dims = useRef({ width, height, size });
  dims.current = { width, height, size };
  const cleanup = useRef<(() => void) | null>(null);

  // Follow external position changes (config reload, resize nudge…) when idle
  useEffect(() => {
    if (!cleanup.current) {
      live.current = { x, y };
      setPos({ x, y });
    }
  }, [x, y]);

  useEffect(() => () => cleanup.current?.(), []);

  const computeDrop = useCallback(
    (px: number, py: number) => {
      const { widgets, settings } = useWidgetStore.getState();
      const others = widgets.filter(w => w.id !== id);
      return findFreeSpot({ x: px, y: py }, dims.current.size, others, {
        gap: settings.spacing,
        grid: settings.snapToGrid ? settings.gridSize : 1,
        bounds: { width: window.innerWidth, height: window.innerHeight }
      });
    },
    [id]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0 || cleanup.current) return;
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = live.current.x;
      const originY = live.current.y;
      let started = false;
      let lastPreview = '';

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!started) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          started = true;
          setIsDragging(true);
          setDragActive(id);
          document.body.style.cursor = 'grabbing';
        }
        const next = clampToBounds(
          { x: originX + dx, y: originY + dy, width: dims.current.width, height: dims.current.height },
          { width: window.innerWidth, height: window.innerHeight }
        );
        live.current = next;
        setPos(next);
        const drop = computeDrop(next.x, next.y);
        const key = `${drop.x},${drop.y}`;
        if (key !== lastPreview) {
          lastPreview = key;
          setDropPreview(drop);
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        stop();
        if (!started) return;

        // Swallow the click that follows a drag so buttons/photos don't react to it
        const swallow = (ce: MouseEvent) => {
          ce.stopPropagation();
          ce.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, true), 0);

        const final = computeDrop(live.current.x, live.current.y);
        live.current = final;
        setPos(final);
        setIsDragging(false);
        setDropPreview(null);
        setDragActive(null);
        document.body.style.cursor = '';
        updatePosition(id, final.x, final.y);
      };

      const stop = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
        cleanup.current = null;
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      cleanup.current = stop;
    },
    [disabled, id, computeDrop, setDragActive, updatePosition]
  );

  return {
    x: pos.x,
    y: pos.y,
    isDragging,
    dropPreview,
    handlers: { onPointerDown }
  };
}
