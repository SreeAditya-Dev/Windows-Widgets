import React from 'react';
import { WidgetType } from '../types/widget';
import { WidgetProps } from './shared';
import { AnalogClockWidget } from '../components/widgets/AnalogClockWidget';
import { FlipClockWidget } from '../components/widgets/FlipClockWidget';
import { WorldClockWidget } from '../components/widgets/WorldClockWidget';
import { CalendarWidget } from '../components/widgets/CalendarWidget';
import { DateWidget } from '../components/widgets/DateWidget';
import { NotesWidget } from '../components/widgets/NotesWidget';
import { TodoWidget } from '../components/widgets/TodoWidget';
import { TimerWidget } from '../components/widgets/TimerWidget';
import { StopwatchWidget } from '../components/widgets/StopwatchWidget';
import { CalculatorWidget } from '../components/widgets/CalculatorWidget';
import { WeatherWidget } from '../components/widgets/WeatherWidget';
import { SystemWidget } from '../components/widgets/SystemWidget';
import { BatteryWidget } from '../components/widgets/BatteryWidget';
import { PhotosWidget } from '../components/widgets/PhotosWidget';
import { SmartStack } from '../components/widgets/SmartStack';

export const WIDGET_COMPONENTS: Record<WidgetType, React.FC<WidgetProps<any>>> = {
  'analog-clock': AnalogClockWidget,
  'flip-clock': FlipClockWidget,
  'world-clock': WorldClockWidget,
  calendar: CalendarWidget,
  date: DateWidget,
  notes: NotesWidget,
  todo: TodoWidget,
  timer: TimerWidget,
  stopwatch: StopwatchWidget,
  calculator: CalculatorWidget,
  weather: WeatherWidget,
  system: SystemWidget,
  battery: BatteryWidget,
  photos: PhotosWidget,
  'smart-stack': SmartStack
};

export const WIDGET_ICONS: Record<WidgetType, string> = {
  'analog-clock': '🕰️',
  'flip-clock': '⏱️',
  'world-clock': '🌍',
  calendar: '📅',
  date: '📆',
  notes: '📝',
  todo: '✅',
  timer: '⏲️',
  stopwatch: '⏱️',
  calculator: '🧮',
  weather: '⛅',
  system: '📊',
  battery: '🔋',
  photos: '🖼️',
  'smart-stack': '🗂️'
};
