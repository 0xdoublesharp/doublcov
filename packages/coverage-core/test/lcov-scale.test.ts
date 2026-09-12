import { performance } from "node:perf_hooks";
import { expect, it } from "vitest";
import { parseLcov } from "../src/lcov.js";

it.each(["end_of_record\n", ""])(
  "keeps function lookup isolated across records with separator %j",
  (separator) => {
    const records = parseLcov(`SF:first.js
FN:10,shared
FNDA:1,shared
${separator}SF:second.js
FNDA:2,shared
FN:20,shared`);
    expect(records.map((record) => record.functions)).toEqual([
      [{ name: "shared", line: 10, hits: 1 }],
      [{ name: "shared", line: 20, hits: 2 }],
    ]);
  },
);

it("preserves large function tables within a generous parsing budget", () => {
  const count = 16_000;
  const expected = Array.from({ length: count }, (_, index) => ({
    name: `function_${index}`,
    line: index + 1,
    hits: index % 3,
  }));
  const input = [
    "SF:generated.js",
    ...expected.map((fn) => `FN:${fn.line},${fn.name}`),
    ...expected.map((fn) => `FNDA:${fn.hits},${fn.name}`),
    "end_of_record",
  ].join("\n");
  const start = performance.now();
  const records = parseLcov(input);
  const elapsed = performance.now() - start;
  expect(records).toHaveLength(1);
  expect(records[0]?.functions).toEqual(expected);
  // Catches repeated full-table searches; leaves ample headroom for shared CI.
  expect(elapsed).toBeLessThan(5_000);
}, 60_000);
