import React from 'react';
import { Check } from 'lucide-react';

export const Group: React.FC<{ title?: string; footer?: React.ReactNode; children: React.ReactNode }> = ({ title, footer, children }) => (
  <section className="mb-6">
    {title && <h3 className="text-[13px] font-semibold text-ink/80 mb-1.5 px-1">{title}</h3>}
    <div className="rounded-[10px] bg-[var(--card)] border border-ink/[0.08] divide-y divide-ink/[0.08] overflow-hidden">{children}</div>
    {footer && <p className="text-[11.5px] text-ink/50 mt-1.5 px-1 leading-snug">{footer}</p>}
  </section>
);

export const Row: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; children?: React.ReactNode; stacked?: boolean }> = ({
  label,
  hint,
  children,
  stacked
}) => (
  <div className={`px-3.5 py-2.5 min-h-[44px] ${stacked ? 'space-y-2' : 'flex items-center gap-4'}`}>
    <div className="flex-1 min-w-0">
      <div className="text-[13px]">{label}</div>
      {hint && <div className="text-[11.5px] text-ink/50 leading-snug mt-0.5">{hint}</div>}
    </div>
    {children}
  </div>
);

export const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button role="switch" aria-checked={on} data-on={on} onClick={() => onChange(!on)} className="mac-switch" />
);

export function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-ink/[0.08] flex-shrink-0">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`px-3 h-[26px] rounded-md text-[12px] font-medium transition-all ${
            value === o.value ? 'bg-[var(--seg-on)] shadow-sm' : 'text-ink/70 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}> = ({ value, min, max, step = 1, onChange, format }) => (
  <div className="flex items-center gap-3 w-[240px] flex-shrink-0">
    <input
      type="range"
      className="mac-range flex-1"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{
        background: `linear-gradient(to right, rgb(var(--accent-rgb)) ${((value - min) / (max - min)) * 100}%, rgb(var(--ink) / 0.15) 0)`
      }}
    />
    <span className="w-11 text-right text-[12px] text-ink/60 tnum">{format ? format(value) : value}</span>
  </div>
);

export const Swatches: React.FC<{ colors: string[]; value: string; onChange: (c: string) => void; size?: number }> = ({
  colors,
  value,
  onChange,
  size = 20
}) => (
  <div className="flex flex-wrap gap-2">
    {colors.map(c => (
      <button
        key={c}
        onClick={() => onChange(c)}
        title={c}
        className="rounded-full flex items-center justify-center border border-black/10 transition-transform hover:scale-110"
        style={{ width: size, height: size, background: c }}
      >
        {value.toLowerCase() === c.toLowerCase() && (
          <Check size={size * 0.6} strokeWidth={3.5} className={c.toUpperCase() === '#FFFFFF' ? 'text-black/70' : 'text-white'} />
        )}
      </button>
    ))}
  </div>
);

export const Button: React.FC<{ onClick: () => void; children: React.ReactNode; kind?: 'default' | 'primary' | 'danger' }> = ({
  onClick,
  children,
  kind = 'default'
}) => (
  <button
    onClick={onClick}
    className={`h-7 px-3.5 rounded-md text-[12.5px] font-medium flex-shrink-0 transition-all active:scale-[0.97] ${
      kind === 'primary'
        ? 'bg-accent text-white hover:brightness-110'
        : kind === 'danger'
        ? 'bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20'
        : 'bg-[var(--btn)] border border-ink/[0.12] shadow-sm hover:brightness-95'
    }`}
  >
    {children}
  </button>
);

export const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className={`h-7 px-2.5 rounded-md bg-[var(--btn)] border border-ink/[0.12] text-[12.5px] outline-none focus:ring-2 focus:ring-accent/50 ${
      className || 'w-[220px]'
    }`}
  />
);

export const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onChange, options, className }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`h-7 px-2 rounded-md bg-[var(--btn)] border border-ink/[0.12] text-[12.5px] outline-none focus:ring-2 focus:ring-accent/50 ${
      className || 'w-[220px]'
    }`}
  >
    {options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
