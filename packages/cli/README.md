<div align="center">
  <img src="https://raw.githubusercontent.com/0xdoublesharp/doublcov/main/docs/doublcov.png" alt="Doublcov report mark" width="132">
  <h1>@0xdoublesharp/doublcov</h1>
  <p><strong>Find what's missing in LCOV coverage.</strong></p>
  <p>
    Browse uncovered code, follow coverage changes, and share reports
    that run in your browser.
  </p>
  <p>
    <a href="https://www.npmjs.com/package/@0xdoublesharp/doublcov"><img alt="npm" src="https://img.shields.io/npm/v/@0xdoublesharp/doublcov?color=2ea043"></a>
    <a href="https://github.com/0xdoublesharp/doublcov/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/0xdoublesharp/doublcov/ci.yml?branch=main&label=ci"></a>
    <a href="https://github.com/0xdoublesharp/doublcov/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
  </p>
</div>

Turn an existing `lcov.info` file into a report:

```bash
npx @0xdoublesharp/doublcov build --lcov lcov.info --sources src
```

## What You Get

- A self-contained HTML report for local use, or a static report directory for large projects and hosting.
- Built-in builders for Foundry, Hardhat, Vitest, Jest, Node/V8, pytest, Rust coverage tools, and gcov/lcov.
- Source browsing with syntax highlighting, navigation to uncovered code, line/branch/function totals, diagnostics, and coverage history.
- Themes and declarative UI hooks for adding project links and report information.
- An npm package, GitHub Action, standalone binaries, and Docker image.

## Install

The npm CLI requires Node 22 or newer.

```bash
npm install --save-dev @0xdoublesharp/doublcov
```

or:

```bash
pnpm add -D @0xdoublesharp/doublcov
```

Run without installing:

```bash
npx @0xdoublesharp/doublcov build
```

or:

```bash
pnpm dlx @0xdoublesharp/doublcov build
```

Use the installed `doublcov` executable in package scripts. To run an example without installing, replace `doublcov` with `npx @0xdoublesharp/doublcov`.

## Commands

Build from existing LCOV:

```bash
doublcov build \
  --lcov lcov.info \
  --sources src
```

Run a coverage tool and build its report in one command. The underlying tool must be installed in your project or environment.

```bash
doublcov foundry -- --exclude-tests --ir-minimum
doublcov hardhat
doublcov vite
doublcov jest
doublcov v8
doublcov pytest
doublcov cargo-llvm-cov
doublcov cargo-tarpaulin
doublcov lcov-capture
```

Local builds create a self-contained `index.html` and open it in your browser. To reopen an existing report:

```bash
doublcov open coverage/report
```

For large projects or hosted reports, generate split static assets:

```bash
doublcov build --mode static --no-open
doublcov open coverage/report
```

`standalone` mode is the local default and writes a self-contained `index.html` that can be opened from disk. `static` mode is the CI default and writes `index.html`, assets, and lazy-loaded JSON files for GitHub Pages and other static hosts. `doublcov open` detects the report type: standalone reports open directly, and static reports are served on an available local port. Static preview runs in the foreground and stops automatically after 30 minutes unless extended from the browser.

Generic `build` defaults:

- LCOV path: `lcov.info`
- source path: `src`
- output directory: `coverage/report`
- history file: `.doublcov/history.json`

Builder commands also read your coverage tool's configuration. Unless you set `--out`, they write the report beside the resolved LCOV file.

## Supported Builders

- `foundry` / `forge`: runs `forge coverage --report lcov`
- `hardhat`: runs `npx hardhat coverage`
- `vite` / `vitest`: runs `npx vitest run --coverage --coverage.reporter=lcov`
- `jest`: runs `npx jest --coverage --coverageReporters=lcov`
- `c8` / `v8` / `node` / `node-test`: runs `npx c8 --reporter=lcov node --test`
- `pytest` / `python` / `coverage.py`: runs `python -m pytest --cov --cov-report=lcov:<path>`
- `cargo-llvm-cov` / `llvm-cov` / `rust`: runs `cargo llvm-cov --lcov --output-path <path>`
- `cargo-tarpaulin` / `tarpaulin`: runs `cargo tarpaulin --out Lcov`
- `lcov-capture` / `lcov` / `gcov` / `c` / `cpp`: runs `lcov --capture` for gcov-style C/C++ coverage data

For tools that always write `lcov.info` inside a report directory, `--lcov` must point to a path ending in `lcov.info`.

Pass arguments to the underlying builder after `--`:

```bash
doublcov forge -- --exclude-tests --ir-minimum
doublcov vite -- --maxWorkers 1
doublcov pytest -- tests/unit
doublcov cargo-llvm-cov -- --workspace
```

Builder integrations are built into this CLI. Adding a new builder requires a code change in the repository.

## Solidity

Foundry:

```json
{
  "scripts": {
    "coverage": "doublcov forge -- --exclude-tests --ir-minimum",
    "coverage:ci": "doublcov forge --no-open -- --exclude-tests --ir-minimum"
  }
}
```

Hardhat:

```json
{
  "scripts": {
    "coverage": "doublcov hardhat",
    "coverage:ci": "doublcov hardhat --no-open"
  }
}
```

From existing Hardhat LCOV:

```bash
npx hardhat coverage
doublcov build \
  --lcov coverage/lcov.info \
  --sources contracts \
  --out coverage/report
```

## JavaScript And TypeScript

```bash
doublcov vite
doublcov jest
doublcov v8
```

`v8` uses `c8` around Node's built-in test runner. Or build from existing LCOV:

```bash
doublcov build \
  --lcov coverage/lcov.info \
  --sources src \
  --extensions ts,tsx,js,jsx,mts,cts,mjs,cjs,vue
```

## Python, Rust, C, And C++

```bash
doublcov pytest
doublcov cargo-llvm-cov
doublcov cargo-tarpaulin
doublcov lcov-capture -- --rc branch_coverage=1
```

These builders assume the ecosystem coverage tool is installed in the project or environment: `pytest-cov` for Python, `cargo-llvm-cov` or `cargo-tarpaulin` for Rust, and `lcov` plus compiler-generated gcov data for C/C++.

## Diagnostics

Attach diagnostic files to show information alongside coverage. Prefix each path with its parser name:

```bash
doublcov build \
  --diagnostic foundry-debug:coverage.debug \
  --diagnostic foundry-bytecode:coverage.bytecode
```

Foundry aliases:

```bash
doublcov forge --debug coverage.debug --bytecode coverage.bytecode
```

## Themes And UI Hooks

Choose a configuration file and the report's default theme:

```bash
doublcov build \
  --customization doublcov.config.json \
  --theme ci-dark
```

Customization JSON can set `"open"` to control whether the generated `index.html` opens after `build` or builder commands. It can also set `lcov`, `out`, `sources`, `extensions`, `history`, and `name` defaults, plus themes and declarative UI hook metadata for `report:header`, `report:summary`, `file:toolbar`, and `sidebar:panel`.

The CLI automatically loads `doublcov.config.json` from the current working directory when it exists. Use `--customization <path>` to override the path. An explicitly supplied customization path must exist.

Local builds open by default. CI and the GitHub Action default to `--mode static --no-open`. Use `--mode`, `--open`, or `--no-open` to override that behavior for one run.

Builder command defaults resolve from CLI flags first, then `doublcov.config.json`, then project config such as `package.json`, `foundry.toml`, Hardhat source paths, Jest/Vitest/c8 config, `.solcover.js`, or `pyproject.toml`. When no report output is configured, Doublcov writes the report to a `report` directory next to the resolved LCOV file.

## Output Hosting

Use standalone reports for opening from disk. For large projects or hosting, choose `--mode static` and upload the entire output directory to GitHub Pages, another static host, or CI artifacts.

## GitHub Action

The GitHub Action downloads a standalone binary and works with projects in any language:

```yaml
- uses: 0xdoublesharp/doublcov@v0
  with:
    command: build
    args: --lcov coverage/lcov.info --sources src --out coverage/report
```

Use the moving major action ref for compatible action updates. Omit `version`
to download the latest GitHub Release binary, or set `version: v0.4.6` to pin
the downloaded CLI binary for reproducible CI.
The action passes `--no-open` by default. Add `--open` to `args` only when the workflow intentionally has a browser-capable environment.

## Distribution

Install the CLI from npm, download a standalone binary and its checksum from [GitHub Releases](https://github.com/0xdoublesharp/doublcov/releases/latest), or use the Docker image for containerized workflows. The GitHub Action uses the same release binaries.

Additional docs:

- [Configuration](https://github.com/0xdoublesharp/doublcov/blob/main/docs/CONFIGURATION.md)
- [CI and hosting](https://github.com/0xdoublesharp/doublcov/blob/main/docs/CI.md)
- [Releasing](https://github.com/0xdoublesharp/doublcov/blob/main/docs/RELEASING.md)
- [Extending Doublcov](https://github.com/0xdoublesharp/doublcov/blob/main/docs/EXTENDING.md)
