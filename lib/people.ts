export type PersonId = "mom" | "dad" | "darcy" | "kai" | "niko" | "nora" | "family";

export interface Person {
  id: PersonId;
  name: string; // shown in legend / Who chips
  init: string;
  color: string;
  fg: string;
  tint: string;
}

export const SHARED_BG = "#EFEDE5";

export const PEOPLE: Record<PersonId, Person> = {
  mom: { id: "mom", name: "Sarah", init: "S", color: "#867427", fg: "#FFFFFF", tint: "#E8E2C9" },
  dad: { id: "dad", name: "Gord", init: "G", color: "#867427", fg: "#FFFFFF", tint: "#E8E2C9" },
  darcy: { id: "darcy", name: "Darcy", init: "D", color: "#E5CD7A", fg: "#410016", tint: "#F8F0D2" },
  kai: { id: "kai", name: "Kai", init: "K", color: "#7381A3", fg: "#FFFFFF", tint: "#DFE3EC" },
  niko: { id: "niko", name: "Niko", init: "N", color: "#CF7128", fg: "#410016", tint: "#F6DFCB" },
  nora: { id: "nora", name: "Nora", init: "N", color: "#F3CDEE", fg: "#410016", tint: "#FBEAF8" },
  family: { id: "family", name: "Family", init: "F", color: "#4A5040", fg: "#FFFFFF", tint: "#E0E2DA" },
};

/** The six selectable people (Family = none selected). */
export const SELECTABLE: PersonId[] = ["mom", "dad", "darcy", "kai", "niko", "nora"];
export const LEGEND: PersonId[] = [...SELECTABLE, "family"];

export function eventBg(who: PersonId[]): string {
  return who.length > 1 ? SHARED_BG : PEOPLE[who[0] ?? "family"].tint;
}
