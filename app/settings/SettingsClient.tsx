"use client";
import { useCallback, useEffect, useState } from "react";

interface Status {
  configured: boolean; storeConfigured: boolean; connected: boolean; connectedAt: string | null;
  expired?: boolean; problem?: string; calendars: { name: string; role: string }[];
}

const ERRORS: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  not_configured: "Google keys aren't set up on the server yet.",
  no_store: "The server storage isn't set up yet.",
  bad_state: "The sign-in expired or didn't match. Please try again.",
};

export default function SettingsClient({ version, builtAt }: { version: string; builtAt: string }) {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => { fetch("/api/google/status", { cache: "no-store" }).then((r) => r.json()).then(setS).catch(() => setS(null)); }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setMsg({ kind: "ok", text: "Connected to Google." });
    const e = q.get("error");
    if (e) setMsg({ kind: "err", text: ERRORS[e] ?? `Google said: ${e}` });
    if (q.size) window.history.replaceState(null, "", "/settings");
    load();
  }, [load]);

  const missing = s && (!s.configured || !s.storeConfigured);
  return (
    <main style={{ height: "100dvh", overflow: "auto", padding: 24, userSelect: "text", WebkitUserSelect: "text" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Settings</h1>
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Google connection">
          <h2>Google account</h2>
          {msg && <p role="status" style={{ fontWeight: 600, color: msg.kind === "ok" ? "#4A5040" : "#A9500F" }}>{msg.text}</p>}
          {!s && <p>Loading…</p>}
          {missing && (
            <p style={{ color: "#5C2E33" }}>
              Not ready yet:{!s.configured && " the Google keys (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing."}{!s.storeConfigured && " the Redis storage isn't connected."}
            </p>
          )}
          {s && !missing && (
            <>
              <p style={{ color: "#5C2E33" }}>
                {s.connected && !s.expired ? <>Connected{s.connectedAt && <> since {new Date(s.connectedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</>}.</> : s.expired ? "The Google login has expired. Please reconnect." : "Not connected yet."}
              </p>
              {s.problem === "calendar_error" && <p style={{ color: "#A9500F" }}>Connected, but the calendar list couldn't be read.</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a className="btn-primary" href="/api/google/connect" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>{s.connected && !s.expired ? "Reconnect" : "Connect Google"}</a>
                {s.connected && <button type="button" className="btn-ghost" onClick={() => fetch("/api/google/disconnect", { method: "POST" }).then(load)}>Disconnect</button>}
              </div>
              {s.connected && !s.expired && s.calendars.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, margin: "8px 0 6px", color: "#5C2E33" }}>Calendars this account can see</h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>{s.calendars.map((c) => <li key={c.name}>{c.name} <span style={{ color: "#7A4A4E", fontSize: 13 }}>({c.role})</span></li>)}</ul>
                </div>
              )}
            </>
          )}
        </section>
        <p style={{ color: "#5C2E33", fontSize: 13 }}>Version {version} · deployed {new Date(builtAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        <a href="/" style={{ color: "#410016", fontWeight: 600 }}>← Back to the dashboard</a>
      </div>
    </main>
  );
}
