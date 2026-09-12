import { describe, expect, it } from "vitest";
import { parseLcov } from "../src/lcov.js";

describe("LCOV function formats", () => {
  it("preserves numeric legacy names without a second comma", () => {
    const [record] = parseLcov("SF:main.js\nFN:10,123\nFNDA:7,123");
    expect(record?.functions).toEqual([{ name: "123", line: 10, hits: 7 }]);
  });
  it.each([false, true])(
    "reads an optional FN end line with hits first: %s",
    (hitsFirst) => {
      const definition = "FN:10,20,example<int, bool>";
      const hits = "FNDA:7,example<int, bool>";
      const [record] = parseLcov(
        [
          "SF:src/main.cpp",
          ...(hitsFirst ? [hits, definition] : [definition, hits]),
          "end_of_record",
        ].join("\n"),
      );
      expect(record?.functions).toEqual([
        { name: "example<int, bool>", line: 10, hits: 7 },
      ]);
      expect(record?.totals.functions).toMatchObject({ found: 1, hit: 1 });
    },
  );

  it("preserves commas in legacy function names without end lines", () => {
    const [record] = parseLcov(
      "SF:main.cpp\nFN:10,example<int, bool>\nFNDA:3,example<int, bool>",
    );
    expect(record?.functions).toEqual([
      { name: "example<int, bool>", line: 10, hits: 3 },
    ]);
  });

  it("reads LCOV 2.2 function groups including index zero", () => {
    const [record] = parseLcov(`SF:main.cpp
FNL:0,10,20
FNA:0,0,example<int>
FNA:0,3,example<int, bool>
FNA:0,2,example<double>
FNL:1,30
FNA:1,0,uncovered
end_of_record`);
    expect(record?.functions).toEqual([
      { name: "example<int, bool>", line: 10, hits: 5 },
      { name: "uncovered", line: 30, hits: 0 },
    ]);
    expect(record?.totals.functions).toMatchObject({ found: 2, hit: 1 });
  });

  it.each(["end_of_record\n", ""])(
    "keeps function groups local to each source with separator %j",
    (separator) => {
      const records = parseLcov(`SF:first.cpp
FNL:0,10
FNA:0,3,first
${separator}SF:second.cpp
FNA:0,4,orphan
FNL:0,20
FNA:0,2,second`);
      expect(records.map((record) => record.functions)).toEqual([
        [{ name: "first", line: 10, hits: 3 }],
        [{ name: "second", line: 20, hits: 2 }],
      ]);
    },
  );

  it("ignores malformed function group indices, lines, hits, and names", () => {
    const [record] = parseLcov(`SF:main.cpp
FNL:-1,10
FNA:-1,3,negativeIndex
FNL:2,0
FNA:2,3,zeroLine
FNL:3,1.5
FNA:3,3,fractionalLine
FNL:0,10
FNA:0,-1,negativeHits
FNA:0,1.5,fractionalHits
FNA:0,1,
FNA:0,1,   
FNA:0,3,valid`);
    expect(record?.functions).toEqual([{ name: "valid", line: 10, hits: 3 }]);
  });
});
