import type { PersonId } from "./people";

// Names accepted in Google Calendar titles and in the stored property (case-insensitive).
const NAMES: Record<string, PersonId> = {
  sarah: "mom", mom: "mom",
  gord: "dad", dad: "dad",
  darcy: "darcy", kai: "kai", niko: "niko", nora: "nora",
};

const tokensOf = (s: string) => s.split(/\s*(?:,|&|\+|\band\b)\s*/i).map((t) => t.trim()).filter(Boolean);
const uniq = <T,>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);

/**
 * Who-tagging, in order:
 * 1. extendedProperties.private.who (set by the dashboard): authoritative, title left alone.
 * 2. Names after a dash at the end of the title ("Ceramics – Darcy, Kai"), stripped from the title.
 * 3. Otherwise a Family event.
 */
export function parseWho(rawTitle: string, privateWho?: string): { title: string; who: PersonId[] } {
  const title = rawTitle.trim();

  if (privateWho !== undefined) {
    const who = uniq(tokensOf(privateWho).map((t) => NAMES[t.toLowerCase()]).filter((p): p is PersonId => !!p));
    return { title, who: who.length ? who : ["family"] };
  }

  const i = Math.max(title.lastIndexOf("–"), title.lastIndexOf("—"), title.lastIndexOf("-"));
  if (i > 0) {
    const tokens = tokensOf(title.slice(i + 1));
    // Only treat it as names if every word is a known name ("Pre-K", "Grandma's - Sunday" stay untouched).
    if (tokens.length && tokens.every((t) => NAMES[t.toLowerCase()])) {
      const stripped = title.slice(0, i).trim();
      if (stripped) return { title: stripped, who: uniq(tokens.map((t) => NAMES[t.toLowerCase()])) };
    }
  }
  return { title, who: ["family"] };
}
