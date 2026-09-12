import { expect, it, vi } from "vitest";
import type * as ShikiCore from "shiki/core";
import { highlightSourceLines } from "../src/syntax";

const tokenizations = vi.hoisted(() => [] as string[]);
vi.mock("shiki/core", async (importOriginal) => {
  const original = await importOriginal<typeof ShikiCore>();
  return {
    ...original,
    createHighlighterCore: async (
      ...args: Parameters<typeof original.createHighlighterCore>
    ) => {
      const highlighter = await original.createHighlighterCore(...args);
      const tokenize = highlighter.codeToTokens.bind(highlighter);
      highlighter.codeToTokens = (...params: Parameters<typeof tokenize>) => {
        tokenizations.push(params[0]);
        return tokenize(...params);
      };
      return highlighter;
    },
  };
});

it.each(["dark", "light"] as const)(
  "preserves real Shiki multiline comment styling across windows in %s mode",
  async (theme) => {
    const lines = [
      "/*",
      ...Array.from({ length: 899 }, () => "const x = 1;"),
      "*/",
      "const outside = 2;",
    ];
    const full = await highlightSourceLines(lines, "comment.ts", theme);
    const commentColor = "#6A737D";
    expect(
      full[400]!.every((token) => token.style?.color === commentColor),
    ).toBe(true);
    const middle = await highlightSourceLines(lines, "comment.ts", theme, {
      start: 400,
      end: 800,
    });
    expect(middle).toHaveLength(400);
    expect(middle[0]).toEqual(full[400]);
    expect(middle[399]).toEqual(full[799]);
    expect(
      middle[0]!.every((token) => token.style?.color === commentColor),
    ).toBe(true);
    const tail = await highlightSourceLines(lines, "comment.ts", theme, {
      start: 800,
      end: 902,
    });
    expect(tail).toEqual(full.slice(800, 902));
    expect(
      tail.at(-1)!.some((token) => token.style?.color !== commentColor),
    ).toBe(true);
    const back = await highlightSourceLines(lines, "comment.ts", theme, {
      start: 400,
      end: 800,
    });
    expect(back).toEqual(middle);
  },
  30_000,
);

it("preserves template string context and isolates replacement sources and themes", async () => {
  const lines = [
    "const text = `",
    ...Array.from({ length: 899 }, () => "const x = 1;"),
    "`;",
    "const outside = 2;",
  ];
  const full = await highlightSourceLines(lines, "string.ts", "dark");
  const middle = await highlightSourceLines(lines, "string.ts", "dark", {
    start: 400,
    end: 800,
  });
  expect(middle).toHaveLength(400);
  expect(middle[0]).toEqual(full[400]);
  expect(middle[0]!.every((token) => token.style?.color === "#9ECBFF")).toBe(
    true,
  );
  const light = await highlightSourceLines(lines, "string.ts", "light", {
    start: 400,
    end: 800,
  });
  expect(light[0]!.every((token) => token.style?.color === "#032F62")).toBe(
    true,
  );
  const replacement = [...lines];
  replacement[0] = "// no template string";
  const changed = await highlightSourceLines(replacement, "string.ts", "dark", {
    start: 400,
    end: 800,
  });
  expect(changed[0]).not.toEqual(middle[0]);
}, 30_000);

it("reuses recent windows and resumes evicted windows from cached grammar state", async () => {
  const lines = [
    "/*",
    ...Array.from({ length: 5398 }, (_, i) => `const row${i} = 1;`),
    "*/",
  ];
  tokenizations.length = 0;
  for (let start = 0; start < 5200; start += 400) {
    const rows = await highlightSourceLines(lines, "cached.ts", "dark", {
      start,
      end: start + 400,
    });
    expect(rows).toHaveLength(400);
    expect(rows[0]!.every((token) => token.style?.color === "#6A737D")).toBe(
      true,
    );
  }
  // Each new window tokenizes only its own 400 lines, without its prefix.
  expect(tokenizations).toHaveLength(13);
  expect(tokenizations.every((code) => code.split("\n").length === 400)).toBe(
    true,
  );
  tokenizations.length = 0;
  await highlightSourceLines(lines, "cached.ts", "dark", {
    start: 4800,
    end: 5200,
  });
  expect(tokenizations).toHaveLength(0);
  const back = await highlightSourceLines(lines, "cached.ts", "dark", {
    start: 400,
    end: 800,
  });
  expect(tokenizations).toEqual([lines.slice(400, 800).join("\n")]);
  expect(back[0]!.every((token) => token.style?.color === "#6A737D")).toBe(
    true,
  );
}, 30_000);

it("returns only the requested range when using the plain-text fallback", async () => {
  const lines = Array.from({ length: 1000 }, (_, i) => `row ${i}`);
  const rows = await highlightSourceLines(lines, "source.unknown", "dark", {
    start: 400,
    end: 800,
  });
  expect(rows).toHaveLength(400);
  expect(rows[0]).toEqual([{ text: "row 400" }]);
  expect(rows.at(-1)).toEqual([{ text: "row 799" }]);
});

it("services queued event-loop work while scanning an unseen source prefix", async () => {
  await highlightSourceLines(["const warmup = 1;"], "warm.ts", "dark");
  const lines = Array.from(
    { length: 2000 },
    () => "const foo = Math.abs(123) + 456; // result",
  );
  let serviced = false;
  const queued = new Promise<void>((resolve) =>
    setTimeout(() => {
      serviced = true;
      resolve();
    }, 0),
  );
  const rows = await highlightSourceLines(lines, "yield.ts", "dark", {
    start: 1600,
    end: 2000,
  });
  const servicedBeforeCompletion = serviced;
  await queued;
  expect(servicedBeforeCompletion).toBe(true);
  expect(rows).toHaveLength(400);
  expect(rows[0]!.map((token) => token.text).join("")).toBe(lines[1600]);
}, 30_000);

it("cancels a superseded highlight before scanning the whole prefix", async () => {
  await highlightSourceLines(["const warmup = 1;"], "warm.ts", "dark");
  const lines = Array.from(
    { length: 2000 },
    () => "const foo = Math.abs(123) + 456; // result",
  );
  const controller = new AbortController();
  tokenizations.length = 0;
  const queued = new Promise<void>((resolve) =>
    setTimeout(() => {
      controller.abort();
      resolve();
    }, 0),
  );
  const rows = await highlightSourceLines(
    lines,
    "cancel.ts",
    "dark",
    { start: 1600, end: 2000 },
    controller.signal,
  );
  await queued;
  expect(rows).toHaveLength(0);
  expect(tokenizations.length).toBeLessThanOrEqual(1);
}, 30_000);
