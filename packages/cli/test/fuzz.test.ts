import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import path from "node:path";
import { parseCommand } from "../src/args.js";
import { isInsideRoot, shellQuote } from "../src/serverHelpers.js";

const fuzzRuns = Number(process.env.DOUBLCOV_FUZZ_RUNS ?? 500);
const fuzzTimeoutMs = Math.max(5_000, fuzzRuns * 2);

describe("cli fuzz properties", () => {
  it(
    "accepts valid server options with exact duration conversion",
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom("serve", "open", "build", "rust"),
          fc.integer({ min: 0, max: 65_535 }),
          fc.integer({ min: 0, max: 100_000 }),
          fc.constantFrom(
            ["ms", 1] as const,
            ["s", 1_000] as const,
            ["m", 60_000] as const,
            ["h", 3_600_000] as const,
          ),
          (name, port, amount, [unit, multiplier]) => {
            const command = parseCommand([
              name,
              "--port",
              String(port),
              "--timeout",
              `${amount}${unit}`,
            ]);
            const options = "options" in command ? command.options : command;
            expect(options).toMatchObject({
              port,
              timeoutMs: amount * multiplier,
            });
          },
        ),
        { numRuns: fuzzRuns },
      );
    },
    fuzzTimeoutMs,
  );

  it(
    "parseCommand handles arbitrary argv without unexpected throwables",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(fc.string({ maxLength: 80 }), { maxLength: 40 }),
            fc
              .tuple(
                fc.constantFrom("serve", "open", "build", "rust"),
                fc.array(fc.integer({ min: 0, max: 9 }), {
                  minLength: 1,
                  maxLength: 320,
                }),
                fc.constantFrom("", "ms", "s", "m", "h"),
              )
              .map(([name, digits, unit]) => [
                name,
                "--timeout",
                `${digits.join("")}${unit}`,
              ]),
          ),
          (argv) => {
            let command: ReturnType<typeof parseCommand>;
            try {
              command = parseCommand(argv);
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              return;
            }
            // Assertions must stay outside the catch: assertion errors are Errors too.
            if ("port" in command) {
              expect(Number.isInteger(command.port)).toBe(true);
              expect(command.port).toBeGreaterThanOrEqual(0);
              expect(command.port).toBeLessThanOrEqual(65_535);
            }
            if ("timeoutMs" in command) {
              expect(Number.isSafeInteger(command.timeoutMs)).toBe(true);
              expect(command.timeoutMs).toBeGreaterThanOrEqual(0);
            }
            if ("options" in command) {
              expect(Number.isInteger(command.options.port)).toBe(true);
              expect(command.options.port).toBeGreaterThanOrEqual(0);
              expect(command.options.port).toBeLessThanOrEqual(65_535);
              expect(Number.isSafeInteger(command.options.timeoutMs)).toBe(
                true,
              );
              expect(command.options.timeoutMs).toBeGreaterThanOrEqual(0);
            }
          },
        ),
        {
          numRuns: fuzzRuns,
          examples: [[["serve", "--timeout", "9".repeat(310)]]],
        },
      );
    },
    fuzzTimeoutMs,
  );

  it(
    "isInsideRoot rejects resolved paths outside the report root",
    () => {
      const root = path.resolve("/tmp/doublcov-root");
      fc.assert(
        fc.property(
          fc.array(fc.string({ maxLength: 24 }), {
            minLength: 1,
            maxLength: 8,
          }),
          (segments) => {
            const target = path.resolve(root, ...segments);
            // Independent oracle: walk ancestors instead of repeating the prefix check.
            const ancestors = new Set<string>();
            let ancestor = target;
            while (!ancestors.has(ancestor)) {
              ancestors.add(ancestor);
              ancestor = path.dirname(ancestor);
            }
            expect(isInsideRoot(target, root)).toBe(ancestors.has(root));
          },
        ),
        { numRuns: fuzzRuns, examples: [[["..cache", "asset.js"]]] },
      );
    },
    fuzzTimeoutMs,
  );

  it(
    "shellQuote emits a single shell token for arbitrary restart paths",
    () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 256 }), (value) => {
          const quoted = shellQuote(value);
          if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
            expect(quoted).toBe(value);
          } else {
            expect(quoted.startsWith("'")).toBe(true);
            expect(quoted.endsWith("'")).toBe(true);
          }
        }),
        { numRuns: fuzzRuns },
      );
    },
    fuzzTimeoutMs,
  );
});
