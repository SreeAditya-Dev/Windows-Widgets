import React, { useEffect, useRef, useState } from 'react';
import { NotesSettings } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';

export const NotesWidget: React.FC<WidgetProps<NotesSettings>> = ({ size, settings, onSettings, preview }) => {
  const [text, setText] = useState(settings.text || '');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const focused = useRef(false);

  // Accept external updates (e.g. from another window) when not editing
  useEffect(() => {
    if (!focused.current) setText(settings.text || '');
  }, [settings.text]);

  const onChange = (v: string) => {
    setText(v);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSettings({ text: v }), 400);
  };

  const firstLine = text.split('\n')[0]?.trim();

  return (
    <div className="w-full h-full flex flex-col px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#E0A800]">Notes</span>
        {size !== 'small' && firstLine && <span className="text-[10px] text-ink/40 tnum">{text.length} chars</span>}
      </div>
      <textarea
        value={text}
        readOnly={preview}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          clearTimeout(saveTimer.current);
          if (text !== settings.text) onSettings({ text });
        }}
        onChange={e => onChange(e.target.value)}
        placeholder="Type a note…"
        spellCheck={false}
        className={`no-drag flex-1 w-full resize-none bg-transparent outline-none placeholder:text-ink/35 leading-snug ${
          size === 'small' ? 'text-[13px]' : 'text-[14px]'
        }`}
      />
    </div>
  );
};
