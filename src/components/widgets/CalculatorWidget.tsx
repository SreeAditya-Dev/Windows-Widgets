import React, { useState } from 'react';
import { WidgetProps } from '../../widgets/shared';

type Op = '+' | '−' | '×' | '÷';

const apply = (a: number, b: number, op: Op) => {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
};

const show = (n: number) => {
  if (!isFinite(n)) return 'Error';
  const s = parseFloat(n.toPrecision(12)).toString();
  return s.length > 12 ? n.toExponential(6) : s;
};

export const CalculatorWidget: React.FC<WidgetProps> = () => {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const input = (d: string) => {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
      return;
    }
    if (d === '.' && display.includes('.')) return;
    if (display.replace(/[-.]/g, '').length >= 11) return;
    setDisplay(display === '0' && d !== '.' ? d : display + d);
  };

  const operator = (next: Op) => {
    const cur = parseFloat(display);
    if (acc !== null && op && !fresh) {
      const r = apply(acc, cur, op);
      setAcc(r);
      setDisplay(show(r));
    } else {
      setAcc(cur);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const r = apply(acc, parseFloat(display), op);
    setDisplay(show(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    if (!fresh && display !== '0') {
      setDisplay('0');
      setFresh(true);
      return;
    }
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const keys: { k: string; kind: 'fn' | 'op' | 'num'; wide?: boolean; onClick: () => void }[] = [
    { k: !fresh && display !== '0' ? 'C' : 'AC', kind: 'fn', onClick: clear },
    { k: '+/−', kind: 'fn', onClick: () => setDisplay(show(-parseFloat(display))) },
    { k: '%', kind: 'fn', onClick: () => setDisplay(show(parseFloat(display) / 100)) },
    { k: '÷', kind: 'op', onClick: () => operator('÷') },
    ...['7', '8', '9'].map(k => ({ k, kind: 'num' as const, onClick: () => input(k) })),
    { k: '×', kind: 'op', onClick: () => operator('×') },
    ...['4', '5', '6'].map(k => ({ k, kind: 'num' as const, onClick: () => input(k) })),
    { k: '−', kind: 'op', onClick: () => operator('−') },
    ...['1', '2', '3'].map(k => ({ k, kind: 'num' as const, onClick: () => input(k) })),
    { k: '+', kind: 'op', onClick: () => operator('+') },
    { k: '0', kind: 'num', wide: true, onClick: () => input('0') },
    { k: '.', kind: 'num', onClick: () => input('.') },
    { k: '=', kind: 'op', onClick: equals }
  ];

  return (
    <div className="w-full h-full flex flex-col px-4 pt-3 pb-4 no-drag-keys">
      <div
        className="flex-1 flex items-end justify-end text-[46px] font-light tnum tracking-tight truncate px-1 pb-1"
        style={{ fontSize: display.length > 9 ? 34 : 46 }}
      >
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2 no-drag">
        {keys.map(key => (
          <button
            key={key.k}
            onClick={key.onClick}
            className={`h-[46px] rounded-full text-[19px] font-medium active:brightness-125 transition-[filter,background] ${
              key.wide ? 'col-span-2 text-left pl-[18px]' : ''
            } ${
              key.kind === 'op'
                ? op === key.k && fresh
                  ? 'bg-white text-[#FF9F0A]'
                  : 'bg-[#FF9F0A] text-white hover:brightness-110'
                : key.kind === 'fn'
                ? 'bg-ink/25 hover:bg-ink/30'
                : 'bg-ink/10 hover:bg-ink/15'
            }`}
          >
            {key.k}
          </button>
        ))}
      </div>
    </div>
  );
};
