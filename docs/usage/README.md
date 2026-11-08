# Usage Guides

Choose the coverage tool your project uses. Each guide covers installation, generating a report, forwarding arguments, CI setup, and troubleshooting. If your tool already produces LCOV, start with [Generic LCOV](generic-lcov.md).

Local runs open a standalone report in your browser. CI defaults to a split static report without opening a browser. CLI flags override `doublcov.config.json`, which overrides defaults read from your coverage tool's configuration. See [Configuration](../CONFIGURATION.md) for the full precedence order.

## Solidity

- [Foundry](foundry.md) — `doublcov forge`
- [Hardhat](hardhat.md) — `doublcov hardhat`

## JavaScript and TypeScript

- [Jest](jest.md) — `doublcov jest`
- [Vitest](vitest.md) — `doublcov vite`
- [Node test runner with c8](c8.md) — `doublcov v8`

## Python

- [pytest](pytest.md) — `doublcov pytest`

## Rust

- [cargo-llvm-cov](cargo-llvm-cov.md) — `doublcov cargo-llvm-cov`
- [cargo-tarpaulin](cargo-tarpaulin.md) — `doublcov cargo-tarpaulin`

## C and C++

- [lcov-capture (gcov)](lcov-capture.md) — `doublcov lcov-capture`

## Any other tool

- [Generic LCOV](generic-lcov.md) — `doublcov build --lcov ...`

## See also

- [CI And Hosting](../CI.md)
- [Configuration](../CONFIGURATION.md)
- [Releasing](../RELEASING.md)
- [Extending Doublcov](../EXTENDING.md)
