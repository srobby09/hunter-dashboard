/** Night mode (wall display only): the screen goes black from 11 PM to 6 AM and wakes on touch for a minute. */
export const NIGHT_START_HOUR = 23;
export const NIGHT_END_HOUR = 6;
export const WAKE_MS = 60 * 1000;

export const isNightHour = (d: Date) => d.getHours() >= NIGHT_START_HOUR || d.getHours() < NIGHT_END_HOUR;

/** ?night=on / ?night=off force night mode for testing; otherwise it follows the clock. */
export function nightActive(d: Date, force: string | null): boolean {
  if (force === "on") return true;
  if (force === "off") return false;
  return isNightHour(d);
}

/** The screen is black when it is night and nobody has touched it in the last minute. */
export const isAsleep = (night: boolean, nowMs: number, wakeUntilMs: number) => night && nowMs >= wakeUntilMs;
