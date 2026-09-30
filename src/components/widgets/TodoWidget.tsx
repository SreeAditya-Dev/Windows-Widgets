import React, { useState } from 'react';
import { TodoSettings, TodoItem } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';
import { Plus, X } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 9);

export const TodoWidget: React.FC<WidgetProps<TodoSettings>> = ({ size, settings, onSettings, preview }) => {
  const items: TodoItem[] = settings.items || [];
  const [draft, setDraft] = useState('');
  const remaining = items.filter(i => !i.done).length;

  const setItems = (next: TodoItem[]) => onSettings({ items: next });
  const toggle = (id: string) => setItems(items.map(i => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setItems(items.filter(i => i.id !== id));
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setItems([...items, { id: uid(), text: t, done: false }]);
    setDraft('');
  };

  // Unfinished first, like Reminders
  const sorted = [...items.filter(i => !i.done), ...items.filter(i => i.done)];

  return (
    <div className="w-full h-full flex flex-col px-4 pt-3 pb-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[15px] font-bold text-[#0A84FF]">{settings.title || 'Reminders'}</span>
        <span className="text-[22px] font-semibold text-ink/80 tnum leading-none">{remaining}</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 -mx-1 px-1">
        {sorted.map(item => (
          <div key={item.id} className="group/item flex items-center gap-2 py-[3px]">
            <button
              onClick={() => !preview && toggle(item.id)}
              className={`w-[17px] h-[17px] rounded-full flex-shrink-0 border-[1.5px] flex items-center justify-center transition-colors ${
                item.done ? 'bg-[#0A84FF] border-[#0A84FF]' : 'border-ink/35 hover:border-[#0A84FF]'
              }`}
            >
              {item.done && <span className="w-[7px] h-[7px] rounded-full bg-white" />}
            </button>
            <span className={`flex-1 truncate text-[13px] ${item.done ? 'text-ink/40 line-through' : ''}`}>{item.text}</span>
            {!preview && (
              <button
                onClick={() => remove(item.id)}
                className="opacity-0 group-hover/item:opacity-100 text-ink/40 hover:text-apple-red transition-opacity"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-[12px] text-ink/40 py-1">All done 🎉</div>}
      </div>

      {size !== 'small' && !preview && (
        <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-ink/10">
          <Plus size={15} className="text-[#0A84FF] flex-shrink-0" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="New Reminder"
            className="no-drag flex-1 bg-transparent outline-none text-[13px] placeholder:text-ink/35"
          />
        </div>
      )}
    </div>
  );
};
