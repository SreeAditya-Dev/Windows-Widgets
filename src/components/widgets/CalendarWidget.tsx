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

export const MonthGrid: React.FC<{
  year: number;
  month: number;
  today: Date;
  firstDay: number;
  cell: number;
  font: number;
  rowGap?: number;
}> = ({ year, month, today, firstDay, cell, font, rowGap = 2 }) => {
  const cells = useMemo(() => buildMonth(year, month, firstDay), [year, month, firstDay]);
  const heads = [...WEEKDAYS.slice(firstDay), ...WEEKDAYS.slice(0, firstDay)];
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="grid grid-cols-7 text-center tnum" style={{ fontSize: font, rowGap }}>
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

const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: 'long' });

const NavButtons: React.FC<{ offset: number; setOffset: React.Dispatch<React.SetStateAction<number>>; compact?: boolean }> = ({
  offset,
  setOffset,
  compact
}) => {
  const btn = compact ? 'w-5 h-5' : 'w-7 h-7';
  const icon = compact ? 13 : 16;
  return (
    <div className="flex items-center gap-0.5 no-drag">
      <button onClick={() => setOffset(o => o - 1)} className={`${btn} rounded-full hover:bg-ink/10 flex items-center justify-center text-ink/70`}>
        <ChevronLeft size={icon} />
      </button>
      {offset !== 0 && (
        <button
          onClick={() => setOffset(0)}
          className={`${compact ? 'px-1.5 h-5 text-[10px]' : 'px-2 h-7 text-[11px]'} rounded-full hover:bg-ink/10 font-semibold text-apple-red`}
        >
          Today
        </button>
      )}
      <button onClick={() => setOffset(o => o + 1)} className={`${btn} rounded-full hover:bg-ink/10 flex items-center justify-center text-ink/70`}>
        <ChevronRight size={icon} />
      </button>
    </div>
  );
};

/** Month calendar: this month (small), this + next month (medium), browsable full month (large). */
export const CalendarWidget: React.FC<WidgetProps<CalendarSettings>> = ({ size, settings }) => {
  const now = useNow(60000);
  const firstDay = settings.firstDayOfWeek ?? 1;
  const [offset, setOffset] = useState(0);

  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });

  if (size === 'small') {
    return (
      <div className="w-full h-full px-3 pt-3 pb-2.5 flex flex-col">
        <div className="text-[11px] font-bold uppercase tracking-wide text-apple-red px-1 mb-0.5">{monthName(now)}</div>
        <div className="flex-1 flex items-center">
          <div className="w-full">
            <MonthGrid year={now.getFullYear()} month={now.getMonth()} today={now} firstDay={firstDay} cell={17} font={9.5} rowGap={1} />
          </div>
        </div>
      </div>
    );
  }

  if (size === 'medium') {
    const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    const sameYear = view.getFullYear() === next.getFullYear() && view.getFullYear() === now.getFullYear();
    const label = (d: Date) => (sameYear ? monthName(d) : `${monthName(d)} ${d.getFullYear()}`);
    return (
      <div className="w-full h-full px-4 pt-3 pb-2.5 flex gap-5">
        {[view, next].map((m, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col">
            <div className="h-5 flex items-center justify-between mb-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-apple-red truncate px-1">{label(m)}</div>
              {i === 1 && <NavButtons offset={offset} setOffset={setOffset} compact />}
            </div>
            <MonthGrid year={m.getFullYear()} month={m.getMonth()} today={now} firstDay={firstDay} cell={17} font={9.5} rowGap={1} />
          </div>
        ))}
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
        <NavButtons offset={offset} setOffset={setOffset} />
      </div>
      <div className="flex-1 flex items-center">
        <div className="w-full">
          <MonthGrid year={view.getFullYear()} month={view.getMonth()} today={now} firstDay={firstDay} cell={34} font={14} />
        </div>
      </div>
    </div>
  );
};
