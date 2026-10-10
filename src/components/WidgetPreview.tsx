import React from 'react';
import { WidgetType, WidgetSize, WIDGET_DIMENSIONS } from '../types/widget';
import { WIDGET_META, defaultSettingsFor } from '../widgets/defaults';
import { WIDGET_COMPONENTS } from '../widgets/registry';
import { useWidgetStore } from '../hooks/useWidgetStore';

const noop = () => {};

/** Static, non-draggable rendering of a widget (gallery, settings) scaled to fit. */
export const WidgetPreview: React.FC<{
  type: WidgetType;
  size: WidgetSize;
  scale?: number;
  scheme: 'dark' | 'light';
  tint?: string;
  settings?: Record<string, any>;
}> = ({ type, size, scale = 1, scheme, tint, settings }) => {
  const style = useWidgetStore(s => s.settings.style);
  const opacity = useWidgetStore(s => s.settings.opacity);
  const meta = WIDGET_META[type];
  const Comp = WIDGET_COMPONENTS[type];
  const d = WIDGET_DIMENSIONS[size];
  const cls = `style-${style} scheme-${scheme}`;

  return (
    <div style={{ width: d.width * scale, height: d.height * scale }} className="relative flex-shrink-0">
      <div
        className={`widget-shell ${cls} pointer-events-none`}
        style={{
          width: d.width,
          height: d.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          ['--tint' as any]: tint || meta.tint
        }}
      >
        <div className={`widget-clip ${cls} ${meta.fullBleed ? 'full-bleed' : ''} ${meta.bare ? 'bare' : ''}`}>
          {!meta.fullBleed && <div className="widget-bg" style={{ opacity: Math.max(opacity, 0.85) }} />}
          <Comp id={`preview-${type}-${size}`} size={size} settings={{ ...defaultSettingsFor(type), ...(settings || {}) }} onSettings={noop} preview />
        </div>
      </div>
    </div>
  );
};
