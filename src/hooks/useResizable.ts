import { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetSize, WIDGET_DIMENSIONS } from '../types/widget';
import { useWidgetStore } from './useWidgetStore';

/**
 * Corner-drag resizing that snaps to the macOS preset sizes the widget supports.
 * While dragging, a ghost outline shows the size the widget will become.
 */
export function useResizable(id: string, size: WidgetSize, supported: WidgetSize[], disabled: boolean) {
  const updateSize = useWidgetStore(s => s.updateSize);
  const setDragActive = useWidgetStore(s => s.setDragActive);
  const [ghost, setGhost] = useState<WidgetSize | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const supportedRef = useRef(supported);
  supportedRef.current = supported;

  useEffect(() => () => cleanup.current?.(), []);

  const nearest = (w: number, h: number): WidgetSize => {
    let best = supportedRef.current[0];
    let bestD = Infinity;
    for (const s of supportedRef.current) {
      const d = WIDGET_DIMENSIONS[s];
      const dist = (d.width - w) ** 2 + (d.height - h) ** 2;
      if (dist < bestD) {
        bestD = dist;
        best = s;
      }
    }
    return best;
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0 || cleanup.current) return;
      e.stopPropagation();
      e.preventDefault();

      const pointerId = e.pointerId;
      const d = WIDGET_DIMENSIONS[size];
      const sx = e.clientX;
      const sy = e.clientY;
      const target = (ev: PointerEvent) => nearest(d.width + (ev.clientX - sx), d.height + (ev.clientY - sy));

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) setGhost(target(ev));
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        stop();
        const next = target(ev);
        setGhost(null);
        setDragActive(null);
        document.body.style.cursor = '';
        if (next !== size) updateSize(id, next);
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
      document.body.style.cursor = 'nwse-resize';
      setGhost(size);
      setDragActive(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, size, id]
  );

  return { ghost, handleProps: { onPointerDown } };
}
