export interface GeoResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WeatherData {
  fetchedAt: number;
  current: { temp: number; feels: number; code: number; isDay: boolean; humidity: number; wind: number };
  today: { max: number; min: number };
  hourly: { time: string; temp: number; code: number; isDay: boolean }[];
  daily: { date: string; max: number; min: number; code: number }[];
}

export async function searchCity(q: string): Promise<GeoResult[]> {
  if (!q.trim()) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`
  );
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const json = await res.json();
  return (json.results || []) as GeoResult[];
}

const CACHE_MS = 30 * 60 * 1000;

export async function fetchWeather(lat: number, lon: number, unit: 'c' | 'f', force = false): Promise<WeatherData> {
  const key = `weather:${lat.toFixed(3)},${lon.toFixed(3)},${unit}`;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null') as WeatherData | null;
      if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached;
    } catch {
      /* ignore */
    }
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '6',
    temperature_unit: unit === 'f' ? 'fahrenheit' : 'celsius'
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather failed (${res.status})`);
  const j = await res.json();

  const nowIso = j.current.time as string;
  const startIdx = Math.max(0, (j.hourly.time as string[]).findIndex(t => t >= nowIso.slice(0, 13)));

  const data: WeatherData = {
    fetchedAt: Date.now(),
    current: {
      temp: j.current.temperature_2m,
      feels: j.current.apparent_temperature,
      code: j.current.weather_code,
      isDay: !!j.current.is_day,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m
    },
    today: { max: j.daily.temperature_2m_max[0], min: j.daily.temperature_2m_min[0] },
    hourly: (j.hourly.time as string[]).slice(startIdx, startIdx + 6).map((t, i) => ({
      time: t,
      temp: j.hourly.temperature_2m[startIdx + i],
      code: j.hourly.weather_code[startIdx + i],
      isDay: !!j.hourly.is_day[startIdx + i]
    })),
    daily: (j.daily.time as string[]).map((d, i) => ({
      date: d,
      max: j.daily.temperature_2m_max[i],
      min: j.daily.temperature_2m_min[i],
      code: j.daily.weather_code[i]
    }))
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  return data;
}

/** WMO weather interpretation codes → label */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export function weatherKind(code: number): WeatherKind {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  return 'storm';
}
