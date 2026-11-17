import { PEOPLE, SELECTABLE, type PersonId } from "./people";

/**
 * Event ownership comes from a prefix at the START of the event title:
 *   "Darcy: Swim", "Darcy - Swim", "D+K: Ceramics", "Darcy and Kai: Ceramics"
 * A hyphen inside a word is not a separator ("Light-up parade" is a Family event).
 */

// Full names (and Mom/Dad).
const FULL: Record<string, PersonId> = {
  sarah: "mom", mom: "mom",
  gord: "dad", dad: "dad",
  darcy: "darcy", kai: "kai", niko: "niko", nora: "nora",
};
// Initials, for one person or several. A bare "N" is ambiguous (Niko or Nora), so it is not here.
const INITIALS: Record<string, PersonId> = { s: "mom", g: "dad", d: "darcy", k: "kai", ni: "niko", no: "nora" };

const PREFIX = /^\s*([A-Za-z+&,\s]{1,40}?)\s*(?::|\s[-–—])\s*(.+)$/;
const SPLIT = /\s*(?:\+|&|,|\band\b)\s*/i;

const uniq = <T,>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);

export function parseWho(rawTitle: string): { title: string; who: PersonId[] } {
  const original = rawTitle.trim();
  const family = { title: original, who: ["family"] as PersonId[] };

  const m = PREFIX.exec(original);
  if (!m) return family;
  const display = m[2].trim();
  if (!display) return family;

  const parts = m[1].split(SPLIT).map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return family;

  const owners: PersonId[] = [];
  for (const p of parts) {
    const person = FULL[p] ?? INITIALS[p];
    if (!person) return family; // unknown name or bare "N": not a prefix
    owners.push(person);
  }
  return { title: display, who: uniq(owners) };
}

const INITIAL_OF: Record<string, string> = { mom: "S", dad: "G", darcy: "D", kai: "K", niko: "Ni", nora: "No" };

/** The title to save to Google Calendar so phone and dashboard stay consistent. */
export function buildTitle(title: string, who: PersonId[]): string {
  const t = title.trim();
  const people = SELECTABLE.filter((id) => who.includes(id)); // fixed order: S, G, D, K, Ni, No
  if (people.length === 0) return t;
  if (people.length === 1) return `${PEOPLE[people[0]].name}: ${t}`;
  return `${people.map((p) => INITIAL_OF[p]).join("+")}: ${t}`;
}
