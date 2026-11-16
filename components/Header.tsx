import { fmtClock } from "@/lib/dates";
import type { Weather } from "@/lib/types";

function WeatherIcon({ kind }: { kind: Weather["icon"] }) {
  const p = { width: 34, height: 34, viewBox: "0 0 24 24", fill: "none", stroke: "#4C0A14", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  if (kind === "sun") return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
  if (kind === "cloud") return <svg {...p}><path d="M7 18a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 12 3.5 3.5 0 0 1 17 18H7z" /></svg>;
  return <svg {...p}><path d="M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" /></svg>;
}

export default function Header({ now, weather }: { now: Date; weather: Weather }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h1>
        <span className="clock">{fmtClock(now)}</span>
      </div>
      <div className="header-right">
        <div className="weather" aria-label="Weather">
          <WeatherIcon kind={weather.icon} />
          <span className="temp">{weather.temp}°</span>
          <div className="lbl">
            <b>{weather.label}</b>
            <span>H {weather.high}° · L {weather.low}°</span>
          </div>
        </div>
      </div>
    </header>
  );
}
