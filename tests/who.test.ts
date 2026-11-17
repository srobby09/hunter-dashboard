import assert from "node:assert/strict";
import { test } from "node:test";
import type { PersonId } from "../lib/people";
import { buildTitle, parseWho } from "../lib/who";

const cases: [input: string, who: PersonId[], title: string][] = [
  // From the spec
  ["Darcy: Swim", ["darcy"], "Swim"],
  ["Darcy - Swim", ["darcy"], "Swim"],
  ["Kai – Soccer", ["kai"], "Soccer"],
  ["D+K: Ceramics", ["darcy", "kai"], "Ceramics"],
  ["Ni+No: Playdate", ["niko", "nora"], "Playdate"],
  ["Darcy and Kai: Ceramics", ["darcy", "kai"], "Ceramics"],
  ["Gord: Hockey", ["dad"], "Hockey"],
  ["Pizza night", ["family"], "Pizza night"],
  ["Light-up parade", ["family"], "Light-up parade"],
  ["N+D: Swim", ["family"], "N+D: Swim"],
  ["Dentist: Kai", ["family"], "Dentist: Kai"],
  // Extra edge cases
  ["Darcy, Kai: Ceramics", ["darcy", "kai"], "Ceramics"],
  ["D+No - Birthday party", ["darcy", "nora"], "Birthday party"],
  ["darcy: swim", ["darcy"], "swim"],
  ["Mom: Client call", ["mom"], "Client call"],
  ["Dad & Mom: Dinner out", ["dad", "mom"], "Dinner out"],
  ["Sarah, Mom: Dinner", ["mom"], "Dinner"],
  ["Kai — Soccer", ["kai"], "Soccer"],
  ["Pre-K pickup", ["family"], "Pre-K pickup"],
  ["Kai-Soccer", ["family"], "Kai-Soccer"], // hyphen with no space before it is not a separator
  ["D: Swim", ["family"], "D: Swim"], // a single initial is not accepted
  ["N: Swim", ["family"], "N: Swim"], // bare N is ambiguous
  ["Darcy:", ["family"], "Darcy:"],
  ["Brunch at Grandma's: yum", ["family"], "Brunch at Grandma's: yum"],
  ["Darcy: Swim: lesson 2", ["darcy"], "Swim: lesson 2"],
];

for (const [input, who, title] of cases) {
  test(`parse "${input}"`, () => assert.deepEqual(parseWho(input), { who, title }));
}

test("buildTitle writes the prefix in the agreed format", () => {
  assert.equal(buildTitle("Pizza night", []), "Pizza night");
  assert.equal(buildTitle("Swim", ["darcy"]), "Darcy: Swim");
  assert.equal(buildTitle("Hockey", ["dad"]), "Gord: Hockey");
  assert.equal(buildTitle("Ceramics", ["kai", "darcy"]), "D+K: Ceramics");
  assert.equal(buildTitle("Playdate", ["nora", "niko"]), "Ni+No: Playdate");
  assert.equal(buildTitle("Dinner", ["mom", "dad", "kai"]), "S+G+K: Dinner");
});

test("what the dashboard writes is read back the same way", () => {
  const groups: PersonId[][] = [["mom"], ["dad"], ["darcy"], ["kai"], ["niko"], ["nora"], ["darcy", "kai"], ["niko", "nora"], ["mom", "dad", "darcy", "kai", "niko", "nora"]];
  for (const who of groups) {
    const back = parseWho(buildTitle("Test event", who));
    assert.equal(back.title, "Test event");
    assert.deepEqual([...back.who].sort(), [...who].sort());
  }
});
