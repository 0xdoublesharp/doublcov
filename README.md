<div align="center">
  <img src="docs/doublcov.png" alt="Doublcov report mark" width="132">
  <h1>Doublcov</h1>
  <p><strong>Find what's missing in LCOV coverage.</strong></p>
  <p>
    Browse uncovered code, follow coverage changes, and share reports
    that run in your browser.
  </p>
  <p>
    <a href="https://www.npmjs.com/package/@0xdoublesharp/doublcov"><img alt="npm" src="https://img.shields.io/npm/v/@0xdoublesharp/doublcov?color=2ea043"></a>
    <a href="https://github.com/0xdoublesharp/doublcov/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/0xdoublesharp/doublcov/ci.yml?branch=main&label=ci"></a>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
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

The npm CLI requires Node 22 or newer. Install it in your project:

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

For projects without Node, use the [GitHub Action](docs/CI.md#github-actions), [standalone release binaries](https://github.com/0xdoublesharp/doublcov/releases/latest), or [Docker image](docs/RELEASING.md#release-channels).

## Quick Start

Use the installed `doublcov` executable in package scripts. To run an example without installing, replace `doublcov` with `npx @0xdoublesharp/doublcov`.

If your project already produces LCOV:

```bash
doublcov build \
  --lcov lcov.info \
  --sources src
```

Local builds create a self-contained `index.html` and open it in your browser. To generate a report without opening it:

```bash
doublcov build --no-open
```

Open a report you've already generated:

```bash
doublcov open coverage/report
```

Generic `build` defaults:

- LCOV: `lcov.info`
- sources: `src`
- output: `coverage/report`
- history: `.doublcov/history.json`
- optional config: `doublcov.config.json` when present

Builder commands also read your coverage tool's configuration. Unless you set `--out`, they write the report beside the resolved LCOV file.

## Built-In Builders

Run a coverage tool and build its report in one command. The underlying tool must be installed in your project or environment.

```bash
doublcov forge -- --exclude-tests --ir-minimum
doublcov hardhat
doublcov vite
doublcov jest
doublcov v8
doublcov pytest
doublcov cargo-llvm-cov
doublcov cargo-tarpaulin
doublcov lcov-capture
```

Supported builder commands:

| Command                                    | Tool it runs                                         | Typical projects               |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------ |
| `foundry`, `forge`                         | `forge coverage --report lcov`                       | Solidity / Foundry             |
| `hardhat`                                  | `npx hardhat coverage`                               | Solidity / Hardhat             |
| `vite`, `vitest`                           | `npx vitest run --coverage --coverage.reporter=lcov` | Vite / Vitest                  |
| `jest`                                     | `npx jest --coverage --coverageReporters=lcov`       | Jest                           |
| `c8`, `v8`, `node`, `node-test`            | `npx c8 --reporter=lcov node --test`                 | Node test runner / V8 coverage |
| `pytest`, `python`, `coverage.py`          | `python -m pytest --cov --cov-report=lcov:<path>`    | Python / pytest-cov            |
| `cargo-llvm-cov`, `llvm-cov`, `rust`       | `cargo llvm-cov --lcov --output-path <path>`         | Rust                           |
| `cargo-tarpaulin`, `tarpaulin`             | `cargo tarpaulin --out Lcov`                         | Rust                           |
| `lcov-capture`, `lcov`, `gcov`, `c`, `cpp` | `lcov --capture`                                     | C / C++ gcov data              |

Builder arguments after `--` are passed to the underlying tool:

```bash
doublcov forge -- --match-path test/Foo.t.sol
doublcov cargo-llvm-cov -- --workspace
```

To add a builder, see [Extending Doublcov](docs/EXTENDING.md).

## Usage Guides

Choose a [usage guide](docs/usage/README.md) for setup, command examples, CI integration, and troubleshooting:

- Solidity: [Foundry](docs/usage/foundry.md), [Hardhat](docs/usage/hardhat.md)
- JavaScript and TypeScript: [Jest](docs/usage/jest.md), [Vitest](docs/usage/vitest.md), [Node test runner with c8](docs/usage/c8.md)
- Python: [pytest](docs/usage/pytest.md)
- Rust: [cargo-llvm-cov](docs/usage/cargo-llvm-cov.md), [cargo-tarpaulin](docs/usage/cargo-tarpaulin.md)
- C and C++: [lcov-capture](docs/usage/lcov-capture.md)
- Any other tool: [Generic LCOV](docs/usage/generic-lcov.md)

## Languages

Doublcov accepts LCOV from any coverage tool. Built-in source detection and syntax highlighting cover Solidity, C, C++, TypeScript, JavaScript, Python, Rust, Go, Java, C#, Kotlin, PHP, Ruby, Swift, Scala, Dart, Lua, R, shell, CSS, HTML/XML, Vue, JSON, YAML, TOML, and Markdown.

Unknown source files can still be included with `--extensions` and render as plain text.

## Configuration

Doublcov automatically reads `doublcov.config.json` from the current working directory when it exists. Use `--customization <path>` to choose another file; explicit paths must exist.

Configuration supports:

- `open` to control whether the generated `index.html` opens after `build` or builder commands
- `mode`, `lcov`, `out`, `sources`, `extensions`, `history`, and `name` defaults
- `defaultTheme`
- custom `themes`
- declarative hooks for `report:header`, `report:summary`, `file:toolbar`, and `sidebar:panel`

Reports open automatically after local `build` and builder commands. CI and the GitHub Action default to `--no-open`. Use `--open` or `--no-open` to override that behavior for a single run.

Output modes:

- `standalone` writes a self-contained `index.html` that can be opened from disk. This is the local default.
- `static` writes `index.html`, assets, and lazy-loaded JSON files for large projects and static hosts. This is the CI default.

Use `doublcov open coverage/report` to view any existing report. It opens standalone reports directly from disk and serves static reports on an available local port. The local server runs in the foreground and shuts down automatically unless extended from the browser.

For builder commands, default paths come from CLI flags first, then `doublcov.config.json`, then project config such as `package.json`, `foundry.toml`, Hardhat source paths, Jest/Vitest/c8 config, `.solcover.js`, or `pyproject.toml`. If no report output is configured, the report is written to a `report` directory next to the resolved LCOV file.

See [Configuration](docs/CONFIGURATION.md).

## Diagnostics

Attach diagnostic files to show information alongside coverage. Prefix each path with its parser name; Foundry debug and bytecode parsers are built in:

```bash
doublcov build \
  --lcov lcov.info \
  --diagnostic foundry-debug:coverage.debug \
  --diagnostic foundry-bytecode:coverage.bytecode
```

Foundry aliases:

```bash
doublcov forge --debug coverage.debug --bytecode coverage.bytecode
```

## CI And Hosting

Use standalone reports for opening from disk. For large projects or hosting, choose `--mode static` and upload the entire output directory to CI artifacts, GitHub Pages, object storage, or another static host. Publicly hosted reports include metadata and an image for link previews.

GitHub Actions example:

```yaml
- uses: 0xdoublesharp/doublcov@v0
  with:
    command: build
    args: --lcov coverage/lcov.info --sources src --out coverage/report
```

Add `version: v0.4.6` when you want to pin the downloaded Doublcov binary instead of using the latest release.

See [CI And Hosting](docs/CI.md) for artifact uploads, GitHub Pages, and persistent coverage history. [Releasing](docs/RELEASING.md) describes the available distribution channels.

The GitHub Action passes `--no-open` by default. Add `--open` to `args` only when a workflow intentionally has a browser-capable environment.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run verify:publish
```

The workspace pins pnpm in `package.json`. See [Code Quality Standards](docs/CODE_QUALITY.md) for development checks and [Releasing](docs/RELEASING.md) for the release process.

Build a local standalone binary:

```bash
pnpm run build:binary
./packages/cli/dist/bin/doublcov-macos-arm64 --help
```
