// @ts-check
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLcov } from "../packages/coverage-core/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliBinPath = path.join(root, "packages", "cli", "dist", "bin.js");
const coverageRoot = path.join(root, "coverage", "showcases");
const inputRoot = path.join(coverageRoot, ".inputs");
const historyRoot = path.join(coverageRoot, ".history");
const sourceCustomizationPath = path.join(
  root,
  "fixtures",
  "languages",
  "doublcov.config.json",
);
const filteredCustomizationPath = path.join(
  inputRoot,
  "showcase-customization.json",
);
const languageFixtureLcovPath = path.join(
  root,
  "fixtures",
  "languages",
  "lcov.info",
);
const languageSourceRoot = path.join(root, "fixtures", "languages", "src");
const solidityFixtureRoot = path.join(root, "fixtures", "simple");

const languageFixtureLcov = await fs.readFile(languageFixtureLcovPath, "utf8");
const languageFixtureRecords = parseLcov(languageFixtureLcov);

const showcaseSpecs = [
  {
    slug: "solidity",
    name: "Solidity Fixture",
    lcovPath: path.join(solidityFixtureRoot, "lcov.info"),
    sources: [path.join(solidityFixtureRoot, "src")],
    diagnostics: [
      {
        parser: "foundry-debug",
        path: path.join(solidityFixtureRoot, "coverage.debug"),
      },
      {
        parser: "foundry-bytecode",
        path: path.join(solidityFixtureRoot, "coverage.bytecode"),
      },
    ],
  },
  {
    slug: "rust",
    name: "Rust Fixture",
    includePaths: ["src/lib.rs"],
    sources: [path.join(languageSourceRoot, "lib.rs")],
  },
  {
    slug: "tsjs",
    name: "TS/JS Fixture",
    includePaths: ["src/math.ts", "src/server.js"],
    sources: [
      path.join(languageSourceRoot, "math.ts"),
      path.join(languageSourceRoot, "server.js"),
    ],
  },
  {
    slug: "mixed",
    name: "Mixed Language Fixture",
    lcovPath: languageFixtureLcovPath,
    sources: [languageSourceRoot],
  },
];

await fs.rm(coverageRoot, { recursive: true, force: true });
await fs.mkdir(inputRoot, { recursive: true });
await fs.mkdir(historyRoot, { recursive: true });
await writeShowcaseCustomization();

const outputs = [];
for (const spec of showcaseSpecs) {
  const reportDir = path.join(coverageRoot, spec.slug);
  const lcovPath =
    "includePaths" in spec
      ? await writeSubsetLcov(spec.slug, spec.includePaths)
      : spec.lcovPath;

  await runBuild(spec, lcovPath, reportDir);

  outputs.push({
    slug: spec.slug,
    name: spec.name,
    htmlPath: path.join(reportDir, "index.html"),
  });
}

await writeShowcaseIndex(outputs);

process.stdout.write("\nStandalone showcase previews:\n");
for (const output of outputs) {
  process.stdout.write(`- ${output.name}: ${output.htmlPath}\n`);
}
process.stdout.write(`- Index: ${path.join(coverageRoot, "index.html")}\n`);

/**
 * @param {(typeof showcaseSpecs)[number]} spec
 * @param {string} lcovPath
 * @param {string} reportDir
 */
async function runBuild(spec, lcovPath, reportDir) {
  const args = [
    cliBinPath,
    "build",
    "--lcov",
    lcovPath,
    "--sources",
    spec.sources.join(","),
    "--out",
    reportDir,
    "--history",
    path.join(historyRoot, `${spec.slug}.json`),
    "--mode",
    "standalone",
    "--no-open",
    "--name",
    spec.name,
    "--customization",
    filteredCustomizationPath,
  ];
  for (const diagnostic of spec.diagnostics ?? []) {
    args.push("--diagnostic", `${diagnostic.parser}:${diagnostic.path}`);
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`Showcase build failed for ${spec.slug} (${code}).`));
      }
    });
  });
}

/**
 * @param {string} slug
 * @param {string[]} includePaths
 */
async function writeSubsetLcov(slug, includePaths) {
  const includeSet = new Set(includePaths);
  const selectedRecords = languageFixtureRecords.filter((record) =>
    includeSet.has(normalizeFixturePath(record.sourceFile)),
  );
  if (selectedRecords.length === 0) {
    throw new Error(
      `No LCOV records matched ${includePaths.join(", ")} for ${slug}.`,
    );
  }
  const lcovPath = path.join(inputRoot, `${slug}.lcov.info`);
  await fs.writeFile(lcovPath, serializeLcov(selectedRecords), "utf8");
  return lcovPath;
}

async function writeShowcaseCustomization() {
  /** @type {import("../packages/coverage-core/dist/index.js").CoverageReportCustomization} */
  const customization = JSON.parse(
    await fs.readFile(sourceCustomizationPath, "utf8"),
  );
  const filtered = {
    ...customization,
    ...(Array.isArray(customization.hooks)
      ? {
          hooks: customization.hooks.filter(
            (hook) => hook?.hook !== "report:summary",
          ),
        }
      : {}),
    ...(Array.isArray(customization.plugins)
      ? {
          plugins: customization.plugins.map((plugin) => ({
            ...plugin,
            ...(Array.isArray(plugin?.hooks)
              ? {
                  hooks: plugin.hooks.filter(
                    (hook) => hook?.hook !== "report:summary",
                  ),
                }
              : {}),
          })),
        }
      : {}),
  };
  await fs.writeFile(
    filteredCustomizationPath,
    `${JSON.stringify(filtered, null, 2)}\n`,
    "utf8",
  );
}

/**
 * @param {ReturnType<typeof parseLcov>} records
 */
function serializeLcov(records) {
  return `${records
    .map((record) =>
      [
        `SF:${record.sourceFile}`,
        ...record.functions.map((fn) => `FN:${fn.line},${fn.name}`),
        ...record.functions.map((fn) => `FNDA:${fn.hits},${fn.name}`),
        ...[...record.lines.entries()]
          .sort(([left], [right]) => left - right)
          .map(([line, hits]) => `DA:${line},${hits}`),
        ...record.branches.map((branch) => {
          const taken = branch.taken === null ? "-" : `${branch.taken}`;
          return `BRDA:${branch.line},${branch.block},${branch.branch},${taken}`;
        }),
        "end_of_record",
      ].join("\n"),
    )
    .join("\n")}\n`;
}

/**
 * @param {Array<{ slug: string; name: string; htmlPath: string }>} outputs
 */
async function writeShowcaseIndex(outputs) {
  const items = outputs
    .map(
      (output) => `
        <li>
          <a href="./${output.slug}/index.html">${escapeHtml(output.name)}</a>
          <code>${escapeHtml(output.htmlPath)}</code>
        </li>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Doublcov Fixture Showcases</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: #111827;
        --panel-soft: #1f2937;
        --text: #f9fafb;
        --muted: #cbd5e1;
        --border: #334155;
        --accent: #38bdf8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "SF Pro Display", "Inter", sans-serif;
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 30%),
          var(--bg);
        color: var(--text);
      }
      main {
        width: min(960px, calc(100vw - 48px));
        margin: 48px auto;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2.2rem, 4vw, 3.4rem);
      }
      p {
        margin: 0 0 24px;
        color: var(--muted);
        font-size: 1.05rem;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 14px;
      }
      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(14, 22, 38, 0.96));
      }
      a {
        color: var(--text);
        font-size: 1.1rem;
        font-weight: 700;
        text-decoration: none;
      }
      a:hover { color: var(--accent); }
      code {
        color: var(--muted);
        font-size: 0.92rem;
        word-break: break-all;
      }
      @media (max-width: 720px) {
        li {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Fixture Showcases</h1>
      <p>Standalone previews generated from the Solidity and multi-language fixture coverage inputs.</p>
      <ul>${items}
      </ul>
    </main>
  </body>
</html>
`;
  await fs.writeFile(path.join(coverageRoot, "index.html"), html, "utf8");
}

/**
 * @param {string} value
 */
function normalizeFixturePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
