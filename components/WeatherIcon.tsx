import type { Weather } from "@/lib/types";

export default function WeatherIcon({ kind, size = 34 }: { kind: Weather["icon"]; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "#4C0A14", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  switch (kind) {
    case "sun": return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "partly": return <svg {...p}><circle cx="8" cy="8" r="3" /><path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7" /><path d="M9 20a3.5 3.5 0 1 1 .8-6.9A4.5 4.5 0 0 1 18.4 14 3 3 0 0 1 18 20H9z" /></svg>;
    case "fog": return <svg {...p}><path d="M7 13a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 7 3.5 3.5 0 0 1 17 14H7z" /><path d="M5 18h14M8 21h8" /></svg>;
    case "rain": return <svg {...p}><path d="M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" /></svg>;
    case "snow": return <svg {...p}><path d="M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M9 19.5h.01M13 20.5h.01M17 19.5h.01M11 22h.01M15 22h.01" strokeWidth="2.4" /></svg>;
    case "storm": return <svg {...p}><path d="M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 16H7z" /><path d="M12 14l-2 4h3l-2 4" /></svg>;
    default: return <svg {...p}><path d="M7 16a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.6 10 3.5 3.5 0 0 1 17 17H7z" /></svg>;
  }
}
