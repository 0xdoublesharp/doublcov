import { describe, expect, it } from "vitest";
import { detectIgnoredLines } from "../src/languages.js";
import { buildCoverageBundle } from "../src/report.js";

describe("Solidity assembly boundaries", () => {
  it("does not exclude executable code after assembly text in a block comment", () => {
    const content = [
      "contract Example {",
      "/* Example: assembly {",
      "   this is documentation, not code */",
      "function missed() external {}",
      "}",
    ].join("\n");
    const { report } = buildCoverageBundle({
      lcov: "SF:Example.sol\nFN:4,missed\nFNDA:0,missed\nDA:4,0\nBRDA:4,0,0,0",
      sourceFiles: [{ path: "Example.sol", content }],
    });

    expect(report.ignored.lines).toBe(0);
    expect(report.totals.lines).toEqual({ found: 1, hit: 0, percent: 0 });
    expect(report.totals.functions).toEqual({ found: 1, hit: 0, percent: 0 });
    expect(report.totals.branches).toEqual({ found: 1, hit: 0, percent: 0 });
    expect(report.uncoveredItems.map((item) => item.kind)).toEqual([
      "line",
      "function",
      "branch",
    ]);
  });

  it("ignores braces in block comments inside assembly", () => {
    const lines = [
      "assembly {",
      "  /* }",
      "     { } } */",
      "  mstore(0, 1)",
      "}",
      "afterAssembly();",
    ];
    expect(
      detectIgnoredLines(lines, "solidity").map(({ line }) => line),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("recognizes assembly headers split across lines and comments", () => {
    const lines = [
      "assembly /* { ignored } */",
      '("memory-safe")',
      "{",
      "  mstore(0, 1)",
      "}",
      "afterAssembly();",
    ];
    expect(
      detectIgnoredLines(lines, "solidity").map(({ line }) => line),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("counts braces only within each assembly block", () => {
    const lines = [
      "function f() external { assembly { pop(0) }",
      "  stillSolidity();",
      "  assembly { pop(1) } assembly {",
      "    pop(2)",
      "  }",
      "  afterAssembly();",
      "}",
    ];
    expect(
      detectIgnoredLines(lines, "solidity").map(({ line }) => line),
    ).toEqual([3, 4, 5]);
  });

  it("keeps Solidity functions and statements sharing a line with assembly in coverage", () => {
    const { report } = buildCoverageBundle({
      lcov: "SF:Example.sol\nFN:2,missed\nFNDA:0,missed\nDA:2,0\nDA:3,0\nDA:4,0\nDA:5,0",
      sourceFiles: [
        {
          path: "Example.sol",
          content: [
            "contract Example {",
            "function missed() external returns (uint256 value) { assembly {",
            "value := 1",
            "} return value;",
            "assembly { pop(0) } /* explanation */ assembly { pop(1) }",
            "}}",
          ].join("\n"),
        },
      ],
    });
    expect(report.files[0]?.ignored.assemblyLines).toEqual([3, 5]);
    expect(report.files[0]?.uncovered.lines).toEqual([2, 4]);
    expect(report.totals.lines).toEqual({ found: 2, hit: 0, percent: 0 });
    expect(report.totals.functions).toEqual({ found: 1, hit: 0, percent: 0 });
  });
});
