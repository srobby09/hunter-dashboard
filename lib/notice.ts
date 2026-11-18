import { fmtClock } from "./dates";

export const STALE_MS = 15 * 60 * 1000;

/** The orange notice in the header: what's wrong with the connection, and when the data was last good. */
export function dataNotice(o: { calError: string | null; remError: string | null; lastUpdated: Date | null; now: Date }): string | null {
  const { calError, remError, lastUpdated, now } = o;
  const problem = calError ?? (remError && remError !== "save" ? remError : null);
  const when = lastUpdated ? fmtClock(lastUpdated) : null;
  if (problem === "expired") return "Google login expired · tap to reconnect";
  if (problem === "not_connected" || problem === "not_configured") return "Google not connected · tap to set up";
  if (problem === "calendar_not_found") return "Can’t find the Hunter Family calendar · tap for Settings";
  if (calError) return when ? `Calendar can’t be reached · last updated ${when}` : "Calendar can’t be reached";
  if (lastUpdated && now.getTime() - lastUpdated.getTime() > STALE_MS) return `Not updating · last updated ${when}`;
  return null;
}
