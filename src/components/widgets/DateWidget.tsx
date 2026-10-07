import React from 'react';
import { CalendarSettings } from '../../types/widget';
import { WidgetProps, useNow } from '../../widgets/shared';
import { MonthGrid } from './CalendarWidget';

/** Today's date (small); today's date beside the month (medium). */
export const DateWidget: React.FC<WidgetProps<CalendarSettings>> = ({ size, settings }) => {
  const now = useNow(60000);
  const firstDay = settings.firstDayOfWeek ?? 1;
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const monthName = now.toLocaleDateString(undefined, { month: 'long' });

  if (size === 'medium') {
    return (
      <div className="w-full h-full flex px-4 py-3.5 gap-4">
        <div className="w-[120px] flex-shrink-0 flex flex-col">
          <div className="text-[13px] font-bold uppercase tracking-wide text-apple-red truncate">{weekday}</div>
          <div className="text-[58px] font-light leading-[1] tracking-tight tnum">{now.getDate()}</div>
          <div className="mt-auto text-[13px] font-semibold text-ink/60">{monthName}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase text-apple-red mb-0.5">{monthName}</div>
          <MonthGrid year={now.getFullYear()} month={now.getMonth()} today={now} firstDay={firstDay} cell={16} font={9.5} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <div className="text-[13px] font-bold uppercase tracking-wide text-apple-red truncate">{weekday}</div>
      <div className="text-[64px] font-light leading-[1] tracking-tight mt-0.5 tnum">{now.getDate()}</div>
      <div className="mt-auto text-[13px] font-semibold text-ink/60">
        {monthName} {now.getFullYear()}
      </div>
    </div>
  );
};
