"use client";
import { useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !passcode) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, next: new URLSearchParams(window.location.search).get("next") }) });
      const j = (await r.json().catch(() => ({}))) as { next?: string; error?: string };
      if (r.ok) { window.location.assign(j.next ?? "/"); return; }
      setError(r.status === 401 ? "That passcode isn’t right." : r.status === 429 ? "Too many tries. Please wait 15 minutes and try again." : r.status === 503 ? "Sign-in isn’t available right now. Try again in a minute." : "Something went wrong. Please try again.");
    } catch {
      setError("Can’t reach the server. Check the connection and try again.");
    }
    setBusy(false);
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Hunter Family</h1>
        <p>Enter the family passcode to continue.</p>
        <label htmlFor="passcode" className="sr-only">Passcode</label>
        <input id="passcode" type="password" autoComplete="current-password" enterKeyHint="go" autoFocus placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
        {error && <p role="alert" className="login-error">{error}</p>}
        <button type="submit" disabled={busy || !passcode}>{busy ? "Checking…" : "Continue"}</button>
      </form>
    </main>
  );
}
