import type { Weather } from "./types";

// Victoria / Oak Bay
export const LAT = 48.4263;
export const LON = -123.3135;
export const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
  `&timezone=America%2FVancouver&forecast_days=1`;

type Icon = Weather["icon"];
// WMO weather codes used by Open-Meteo
const CODES: Record<number, [Icon, string]> = {
  0: ["sun", "Clear"], 1: ["sun", "Mostly clear"], 2: ["partly", "Partly cloudy"], 3: ["cloud", "Overcast"],
  45: ["fog", "Fog"], 48: ["fog", "Freezing fog"],
  51: ["rain", "Light drizzle"], 53: ["rain", "Drizzle"], 55: ["rain", "Heavy drizzle"],
  56: ["rain", "Freezing drizzle"], 57: ["rain", "Freezing drizzle"],
  61: ["rain", "Light rain"], 63: ["rain", "Rain"], 65: ["rain", "Heavy rain"],
  66: ["rain", "Freezing rain"], 67: ["rain", "Freezing rain"],
  71: ["snow", "Light snow"], 73: ["snow", "Snow"], 75: ["snow", "Heavy snow"], 77: ["snow", "Snow grains"],
  80: ["rain", "Light showers"], 81: ["rain", "Showers"], 82: ["rain", "Heavy showers"],
  85: ["snow", "Snow showers"], 86: ["snow", "Heavy snow showers"],
  95: ["storm", "Thunderstorm"], 96: ["storm", "Thunderstorm"], 99: ["storm", "Thunderstorm"],
};

interface OpenMeteo {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
}

export function parseWeather(j: OpenMeteo): Weather | null {
  const t = j.current?.temperature_2m;
  const hi = j.daily?.temperature_2m_max?.[0];
  const lo = j.daily?.temperature_2m_min?.[0];
  if (typeof t !== "number" || typeof hi !== "number" || typeof lo !== "number") return null;
  const [icon, label] = CODES[j.current?.weather_code ?? -1] ?? ["cloud", "Cloudy"];
  return { icon, label, temp: Math.round(t), high: Math.round(hi), low: Math.round(lo) };
}
