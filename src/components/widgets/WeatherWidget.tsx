import React, { useCallback, useEffect, useState } from 'react';
import { WeatherSettings } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';
import { fetchWeather, searchCity, weatherKind, weatherLabel, WeatherData, GeoResult } from '../../widgets/weatherApi';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, MapPin, Navigation, RotateCcw } from 'lucide-react';

export const WeatherIcon: React.FC<{ code: number; isDay?: boolean; size?: number; className?: string }> = ({
  code,
  isDay = true,
  size = 18,
  className
}) => {
  const k = weatherKind(code);
  const props = { size, className, strokeWidth: 2 };
  switch (k) {
    case 'clear':
      return isDay ? <Sun {...props} color="#FFD60A" fill="#FFD60A" /> : <Moon {...props} color="#E5E5EA" fill="#E5E5EA" />;
    case 'partly':
      return isDay ? <CloudSun {...props} color="#fff" /> : <CloudMoon {...props} color="#fff" />;
    case 'cloudy':
      return <Cloud {...props} color="#fff" fill="rgba(255,255,255,0.85)" />;
    case 'fog':
      return <CloudFog {...props} color="#fff" />;
    case 'drizzle':
      return <CloudDrizzle {...props} color="#fff" />;
    case 'rain':
      return <CloudRain {...props} color="#fff" />;
    case 'snow':
      return <CloudSnow {...props} color="#fff" />;
    default:
      return <CloudLightning {...props} color="#fff" />;
  }
};

/** Sky gradient like the macOS Weather widget */
function skyGradient(code: number, isDay: boolean) {
  const k = weatherKind(code);
  if (!isDay) return 'linear-gradient(180deg, #0b1a3a 0%, #243b6b 100%)';
  if (k === 'clear' || k === 'partly') return 'linear-gradient(180deg, #2a7fd8 0%, #69aef0 100%)';
  if (k === 'storm') return 'linear-gradient(180deg, #2c3440 0%, #56606e 100%)';
  return 'linear-gradient(180deg, #5a7089 0%, #8ea3b8 100%)';
}

const hourLabel = (iso: string, i: number) => {
  if (i === 0) return 'Now';
  const h = parseInt(iso.slice(11, 13), 10);
  return h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
};

const dayLabel = (iso: string, i: number) =>
  i === 0 ? 'Today' : new Date(iso + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' });

const CitySearch: React.FC<{ onPick: (g: GeoResult) => void }> = ({ onPick }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCity(q)
        .then(r => {
          setResults(r);
          setError(r.length ? '' : 'No cities found');
        })
        .catch(() => setError('No internet connection'));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="w-full h-full flex flex-col p-3 text-white" style={{ background: 'linear-gradient(180deg,#2a7fd8,#69aef0)' }}>
      <div className="flex items-center gap-1.5 text-[12px] font-semibold mb-2">
        <MapPin size={13} /> Choose a city
      </div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search city…"
        className="no-drag w-full h-7 px-2.5 rounded-lg bg-white/25 placeholder:text-white/70 text-[12px] outline-none focus:bg-white/35"
      />
      <div className="flex-1 overflow-y-auto no-scrollbar mt-1.5 space-y-0.5">
        {results.map(r => (
          <button
            key={`${r.latitude},${r.longitude}`}
            onClick={() => onPick(r)}
            className="w-full text-left px-2 py-1 rounded-md hover:bg-white/20 text-[12px] truncate"
          >
            <span className="font-semibold">{r.name}</span>
            <span className="text-white/75">{[r.admin1, r.country].filter(Boolean).join(', ') ? `, ${[r.admin1, r.country].filter(Boolean).join(', ')}` : ''}</span>
          </button>
        ))}
        {error && <div className="text-[11px] text-white/80 px-1">{error}</div>}
      </div>
    </div>
  );
};

export const WeatherWidget: React.FC<WidgetProps<WeatherSettings>> = ({ size, settings, onSettings, preview }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const unit = settings.unit || 'c';
  const hasCity = settings.latitude !== undefined && settings.longitude !== undefined;

  const load = useCallback(
    (force = false) => {
      if (!hasCity) return;
      fetchWeather(settings.latitude!, settings.longitude!, unit, force)
        .then(d => {
          setData(d);
          setError('');
        })
        .catch(() => setError('Can’t load weather'));
    },
    [hasCity, settings.latitude, settings.longitude, unit]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  if (!hasCity) {
    if (preview) {
      // Nice static look for the gallery preview
      return <Preview size={size} />;
    }
    return <CitySearch onPick={g => onSettings({ city: g.name, latitude: g.latitude, longitude: g.longitude })} />;
  }

  const bg = data ? skyGradient(data.current.code, data.current.isDay) : 'linear-gradient(180deg,#2a7fd8,#69aef0)';
  const r = (n: number) => Math.round(n);

  return (
    <div className="w-full h-full text-white flex flex-col relative" style={{ background: bg }}>
      {!data ? (
        <div className="m-auto text-[12px] text-white/80 flex flex-col items-center gap-2">
          {error || 'Loading…'}
          {error && (
            <button onClick={() => load(true)} className="no-drag flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
              <RotateCcw size={11} /> Retry
            </button>
          )}
        </div>
      ) : (
        <div className={`flex flex-col h-full ${size === 'small' ? 'p-3.5' : 'px-4 py-3.5'}`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[15px] font-semibold truncate">
                {settings.city}
                <Navigation size={10} className="fill-white opacity-80" />
              </div>
              <div className={`${size === 'small' ? 'text-[42px]' : 'text-[46px]'} font-light leading-[1.05] tnum`}>{r(data.current.temp)}°</div>
            </div>
            {size !== 'small' && (
              <div className="text-right pt-0.5">
                <WeatherIcon code={data.current.code} isDay={data.current.isDay} size={22} className="ml-auto" />
                <div className="text-[12px] font-semibold mt-1">{weatherLabel(data.current.code)}</div>
                <div className="text-[12px] font-medium text-white/85 tnum">
                  H:{r(data.today.max)}° L:{r(data.today.min)}°
                </div>
              </div>
            )}
          </div>

          {size === 'small' ? (
            <div className="mt-auto">
              <WeatherIcon code={data.current.code} isDay={data.current.isDay} size={17} />
              <div className="text-[12px] font-semibold mt-1">{weatherLabel(data.current.code)}</div>
              <div className="text-[12px] font-medium text-white/85 tnum">
                H:{r(data.today.max)}° L:{r(data.today.min)}°
              </div>
            </div>
          ) : (
            <div className="mt-auto flex justify-between">
              {data.hourly.map((h, i) => (
                <div key={h.time} className="flex flex-col items-center gap-1 text-[11px] font-semibold">
                  <span className="text-white/85">{hourLabel(h.time, i)}</span>
                  <WeatherIcon code={h.code} isDay={h.isDay} size={17} />
                  <span className="tnum">{r(h.temp)}°</span>
                </div>
              ))}
            </div>
          )}

          {size === 'large' && (
            <div className="mt-3 pt-2 border-t border-white/25 space-y-1">
              {data.daily.slice(0, 5).map((d, i) => (
                <div key={d.date} className="flex items-center text-[13px] font-semibold">
                  <span className="w-12">{dayLabel(d.date, i)}</span>
                  <span className="w-8 flex justify-center">
                    <WeatherIcon code={d.code} size={16} />
                  </span>
                  <span className="w-9 text-right text-white/70 tnum">{r(d.min)}°</span>
                  <div className="flex-1 mx-2 h-1 rounded-full bg-white/25 overflow-hidden relative">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-[#8fd3ff] to-[#ffd60a]"
                      style={rangeStyle(d.min, d.max, data.daily)}
                    />
                  </div>
                  <span className="w-9 tnum">{r(d.max)}°</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function rangeStyle(min: number, max: number, days: WeatherData['daily']): React.CSSProperties {
  const lo = Math.min(...days.map(d => d.min));
  const hi = Math.max(...days.map(d => d.max));
  const span = Math.max(1, hi - lo);
  return { left: `${((min - lo) / span) * 100}%`, width: `${Math.max(8, ((max - min) / span) * 100)}%` };
}

const Preview: React.FC<{ size: string }> = () => (
  <div className="w-full h-full text-white p-3.5 flex flex-col" style={{ background: 'linear-gradient(180deg,#2a7fd8,#69aef0)' }}>
    <div className="text-[15px] font-semibold">Cupertino</div>
    <div className="text-[44px] font-light leading-none">24°</div>
    <div className="mt-auto">
      <Sun size={17} color="#FFD60A" fill="#FFD60A" />
      <div className="text-[12px] font-semibold mt-1">Sunny</div>
      <div className="text-[12px] text-white/85">H:27° L:16°</div>
    </div>
  </div>
);
