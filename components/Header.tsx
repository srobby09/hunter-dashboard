import { fmtClock } from "@/lib/dates";
import type { Weather } from "@/lib/types";
import WeatherIcon from "./WeatherIcon";

export default function Header({ now, weather, notice }: { now: Date; weather: Weather | null; notice?: string | null }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h1>
        <span className="clock">{fmtClock(now)}</span>
      </div>
      <div className="header-right">
        {notice && <a className="notice" href="/settings">{notice}</a>}
        {weather && <div className="weather" aria-label="Weather">
          <WeatherIcon kind={weather.icon} />
          <span className="temp">{weather.temp}°</span>
          <div className="lbl">
            <b>{weather.label}</b>
            <span>H {weather.high}° · L {weather.low}°</span>
          </div>
        </div>}
        {weather && !notice && weather.forecast && weather.forecast.length > 0 && (
          <ul className="forecast" aria-label="Three day forecast">
            {weather.forecast.map((f) => {
              const day = new Date(+f.date.slice(0, 4), +f.date.slice(5, 7) - 1, +f.date.slice(8, 10)).toLocaleDateString("en-US", { weekday: "short" });
              return (
                <li key={f.date} aria-label={`${day}: ${f.label}, high ${f.high}, low ${f.low}`}>
                  <span className="fd">{day}</span>
                  <WeatherIcon kind={f.icon} size={24} />
                  <span className="ft">{f.high}°<span className="fl">{f.low}°</span></span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </header>
  );
}
