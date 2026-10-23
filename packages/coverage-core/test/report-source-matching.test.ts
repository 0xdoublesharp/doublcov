import { expect, it } from "vitest";
import * as fc from "fast-check";
import { buildCoverageBundle } from "../src/report.js";

it("matches source contents against an independent path-matching oracle", () => {
  const filePath = fc
    .tuple(
      fc.array(fc.constantFrom("src", "lib", "packages", "a", "b"), {
        maxLength: 4,
      }),
      fc.constantFrom("one.ts", "two.ts", "three.ts"),
    )
    .map(([parts, name]) => [...parts, name].join("/"));
  fc.assert(
    fc.property(
      fc.uniqueArray(filePath, { maxLength: 25 }),
      filePath,
      (paths, target) => {
        const sourceFiles = paths.map((path, index) => ({
          path,
          content: `source ${index}`,
        }));
        const exact = sourceFiles.find((file) => file.path === target);
        const suffixes = sourceFiles.filter(
          (file) =>
            target.endsWith(`/${file.path}`) ||
            file.path.endsWith(`/${target}`),
        );
        const basenames = sourceFiles.filter(
          (file) => file.path.split("/").at(-1) === target.split("/").at(-1),
        );
        const expected =
          exact ??
          (suffixes.length === 1
            ? suffixes[0]
            : basenames.length === 1
              ? basenames[0]
              : undefined);
        const bundle = buildCoverageBundle({
          lcov: `SF:${target}\nDA:1,1`,
          sourceFiles,
        });
        expect(bundle.sourcePayloads[0]?.lines).toEqual([
          expected?.content ?? "",
        ]);
        expect(bundle.report.diagnostics).toHaveLength(expected ? 0 : 1);
      },
    ),
    { numRuns: 500 },
  );
});
