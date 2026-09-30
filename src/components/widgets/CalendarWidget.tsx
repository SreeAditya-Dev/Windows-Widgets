import React, { useMemo, useState } from 'react';
import { CalendarSettings } from '../../types/widget';
import { WidgetProps, useNow } from '../../widgets/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildMonth(year: number, month: number, firstDay: number) {
  const first = new Date(year, month, 1).getDay();
  const lead = (first - firstDay + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

const MonthGrid: React.FC<{
  year: number;
  month: number;
  today: Date;
  firstDay: number;
  cell: number;
  font: number;
}> = ({ year, month, today, firstDay, cell, font }) => {
  const cells = useMemo(() => buildMonth(year, month, firstDay), [year, month, firstDay]);
  const heads = [...WEEKDAYS.slice(firstDay), ...WEEKDAYS.slice(0, firstDay)];
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="grid grid-cols-7 text-center tnum" style={{ fontSize: font, rowGap: 2 }}>
      {heads.map((d, i) => (
        <div key={i} className="font-semibold text-ink/40" style={{ height: cell, lineHeight: `${cell}px` }}>
          {d}
        </div>
      ))}
      {cells.map((day, idx) => {
        const isToday = isThisMonth && day === today.getDate();
        const weekend = (idx + firstDay) % 7 === 0 || (idx + firstDay) % 7 === 6;
        return (
          <div key={idx} className="flex items-center justify-center" style={{ height: cell }}>
            {day && (
              <span
                className={`flex items-center justify-center rounded-full font-semibold ${
                  isToday ? 'bg-apple-red text-white' : weekend ? 'text-ink/45' : 'text-ink/90'
                }`}
                style={{ width: cell, height: cell }}
              >
                {day}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const CalendarWidget: React.FC<WidgetProps<CalendarSettings>> = ({ size, settings }) => {
  const now = useNow(60000);
  const firstDay = settings.firstDayOfWeek ?? 1;
  const [offset, setOffset] = useState(0);

  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: 'long' });

  if (size === 'small') {
    return (
      <div className="w-full h-full p-4 flex flex-col">
        <div className="text-[13px] font-bold uppercase tracking-wide text-apple-red">{weekday}</div>
        <div className="text-[64px] font-light leading-[1] tracking-tight mt-0.5 tnum">{now.getDate()}</div>
        <div className="mt-auto text-[13px] font-semibold text-ink/60">
          {monthName(now)} {now.getFullYear()}
        </div>
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div className="w-full h-full flex px-4 py-3.5 gap-4">
        <div className="w-[120px] flex flex-col">
          <div className="text-[13px] font-bold uppercase tracking-wide text-apple-red">{weekday}</div>
          <div className="text-[58px] font-light leading-[1] tracking-tight tnum">{now.getDate()}</div>
          <div className="mt-auto text-[13px] font-semibold text-ink/60">{monthName(now)}</div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase text-apple-red mb-0.5">{monthName(now)}</div>
          <MonthGrid year={now.getFullYear()} month={now.getMonth()} today={now} firstDay={firstDay} cell={16} font={9.5} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-bold uppercase tracking-wide text-apple-red">{monthName(view)}</div>
          <div className="text-[22px] font-semibold leading-tight">
            {offset === 0 ? `${weekday} ${now.getDate()}` : view.getFullYear()}
          </div>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={() => setOffset(o => o - 1)} className="w-7 h-7 rounded-full hover:bg-ink/10 flex items-center justify-center text-ink/70">
            <ChevronLeft size={16} />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="px-2 h-7 rounded-full hover:bg-ink/10 text-[11px] font-semibold text-apple-red">
              Today
            </button>
          )}
          <button onClick={() => setOffset(o => o + 1)} className="w-7 h-7 rounded-full hover:bg-ink/10 flex items-center justify-center text-ink/70">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center">
        <div className="w-full">
          <MonthGrid year={view.getFullYear()} month={view.getMonth()} today={now} firstDay={firstDay} cell={34} font={14} />
        </div>
      </div>
    </div>
  );
};
