import { WidgetInstance, WidgetSize, WIDGET_DIMENSIONS } from '../types/widget';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const rectOf = (w: Pick<WidgetInstance, 'position' | 'size'>): Rect => {
  const d = WIDGET_DIMENSIONS[w.size] || WIDGET_DIMENSIONS.small;
  return { x: w.position.x, y: w.position.y, width: d.width, height: d.height };
};

export const intersects = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

export const clampToBounds = (
  r: Rect,
  bounds: { width: number; height: number },
  margin = 0
) => ({
  x: Math.max(margin, Math.min(r.x, Math.max(margin, bounds.width - r.width - margin))),
  y: Math.max(0, Math.min(r.y, Math.max(0, bounds.height - r.height)))
});

/**
 * Calculates the horizontal edge margin so the left edge of the desktop
 * matches the margin on the right edge when widgets snap to the grid.
 */
export function getEdgeMargin(bounds: { width: number; height: number }, grid: number): number {
  const g = grid > 1 ? grid : 20;
  const smallWidth = WIDGET_DIMENSIONS.small.width;
  const maxRight = Math.floor((bounds.width - smallWidth) / g) * g;
  const rightSpace = bounds.width - (maxRight + smallWidth);
  return rightSpace > 0 ? rightSpace : 10;
}

const snap = (v: number, grid: number) => (grid > 1 ? Math.round(v / grid) * grid : Math.round(v));

/**
 * Find the free spot nearest to `desired` for a widget of `size`, avoiding `others`.
 * Spiral search over a coarse step so it is cheap even with many widgets.
 */
export function findFreeSpot(
  desired: { x: number; y: number },
  size: WidgetSize,
  others: WidgetInstance[],
  opts: { gap: number; grid: number; bounds: { width: number; height: number }; margin?: number }
): { x: number; y: number } {
  const dims = WIDGET_DIMENSIONS[size];
  const occupied = others.map(rectOf);
  const margin = opts.margin ?? getEdgeMargin(opts.bounds, opts.grid);

  const fits = (x: number, y: number) => {
    const r = { x, y, width: dims.width, height: dims.height };
    if (x < margin || y < 0 || x + r.width > opts.bounds.width - margin + 0.5 || y + r.height > opts.bounds.height) return false;
    return !occupied.some(o => intersects(r, o, opts.gap - 1));
  };

  const start = clampToBounds({ ...desired, width: dims.width, height: dims.height }, opts.bounds, margin);
  const rightEdge = opts.bounds.width - dims.width - margin;

  let sx: number;
  if (opts.grid > 1) {
    if (start.x <= margin + opts.grid / 2) {
      sx = margin;
    } else if (start.x >= rightEdge - opts.grid / 2) {
      sx = rightEdge;
    } else {
      sx = Math.round(start.x / opts.grid) * opts.grid;
    }
  } else {
    sx = Math.round(start.x);
  }
  const sy = snap(start.y, opts.grid);

  if (fits(sx, sy)) return { x: sx, y: sy };

  const step = Math.max(opts.grid, 10);
  const maxRing = Math.ceil(Math.max(opts.bounds.width, opts.bounds.height) / step);
  for (let ring = 1; ring <= maxRing; ring++) {
    let best: { x: number; y: number; d: number } | null = null;
    for (let i = -ring; i <= ring; i++) {
      const candidates = [
        [sx + i * step, sy - ring * step],
        [sx + i * step, sy + ring * step],
        [sx - ring * step, sy + i * step],
        [sx + ring * step, sy + i * step]
      ];
      if (margin > 0) {
        candidates.push([margin, sy + i * step]);
      }
      for (const [cx, cy] of candidates) {
        if (fits(cx, cy)) {
          const d = (cx - sx) ** 2 + (cy - sy) ** 2;
          if (!best || d < best.d) best = { x: cx, y: cy, d };
        }
      }
    }
    if (best) return { x: best.x, y: best.y };
  }
  return { x: sx, y: sy };
}

/** First free slot scanning like the macOS desktop: columns from the top-left. */
export function firstFreeSlot(
  size: WidgetSize,
  others: WidgetInstance[],
  opts: { gap: number; grid: number; bounds: { width: number; height: number }; margin?: number }
) {
  const margin = opts.margin ?? getEdgeMargin(opts.bounds, opts.grid);
  return findFreeSpot({ x: margin, y: margin }, size, others, opts);
}
