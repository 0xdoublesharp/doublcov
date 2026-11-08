# cargo-llvm-cov

Run `doublcov cargo-llvm-cov` to collect Rust coverage and build a report. The aliases `llvm-cov` and `rust` use the same builder, which runs `cargo llvm-cov --lcov --output-path <path>`.

## Prerequisites

- Rust toolchain with [`cargo-llvm-cov`](https://github.com/taiki-e/cargo-llvm-cov) installed
- `llvm-tools-preview` rustup component
- Node 22+ to run the Doublcov CLI

```bash
rustup component add llvm-tools-preview
cargo install cargo-llvm-cov
```

## Install

```bash
npm install --save-dev @0xdoublesharp/doublcov
```

Or use without installing:

```bash
npx @0xdoublesharp/doublcov cargo-llvm-cov
```

## Quick start

```bash
doublcov cargo-llvm-cov
```

Default output: `coverage/report`, unless Doublcov config resolves a different LCOV/report path. Local runs open the report by default.

## Passing arguments to cargo llvm-cov

Forward arguments after `--`:

```bash
doublcov cargo-llvm-cov -- --workspace --all-features
```

## Project scripts

A `Makefile` target:

```make
.PHONY: coverage
coverage:
	npx @0xdoublesharp/doublcov cargo-llvm-cov

.PHONY: coverage-ci
coverage-ci:
	npx @0xdoublesharp/doublcov cargo-llvm-cov --no-open
```

Cargo aliases cannot invoke npm scripts directly. Use a Makefile or shell wrapper for these commands.

## Manual LCOV path

```bash
cargo llvm-cov --lcov --output-path coverage/lcov.info
doublcov build \
  --lcov coverage/lcov.info \
  --sources src \
  --extensions rs \
  --out coverage/report
```

## CI snippet

```yaml
- uses: dtolnay/rust-toolchain@stable
  with:
    components: llvm-tools-preview
- uses: taiki-e/install-action@cargo-llvm-cov
- uses: actions/setup-node@v7
  with:
    node-version: 22
- run: npm ci
- run: npx @0xdoublesharp/doublcov cargo-llvm-cov
- uses: actions/upload-artifact@v7
  with:
    name: coverage-report
    path: coverage/report
```

## Troubleshooting

- **`llvm-tools-preview` missing.** `cargo-llvm-cov` will error during instrumentation. Install with `rustup component add llvm-tools-preview`.
- **Workspace coverage incomplete.** Pass `-- --workspace` to include all crates.
- **Phantom uncovered Rust functions on covered lines.** Doublcov merges duplicate Rust v0 monomorphizations that differ only by crate disambiguator. These can occur in workspace builds or when a crate is compiled in multiple test contexts. Distinct function names remain separate, including names with a shared underscore suffix. If duplicates remain, regenerate LCOV and use a current Doublcov release.
- **Doctests excluded.** `cargo llvm-cov` does not measure doctests by default; pass `-- --doctests` (requires nightly) when needed.
