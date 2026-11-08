# Extending Doublcov

Add coverage builders in the CLI, parsing and language support in the core, and syntax highlighting in the web app. These packages share a report model.

## Package Boundaries

- `@0xdoublesharp/doublcov-core`: LCOV parsing, report building, language registry, diagnostic parser registry, history. This package is private in this workspace.
- `@0xdoublesharp/doublcov`: CLI, builder integrations, filesystem collection, static report generation, and browser-opening helpers.
- `@0xdoublesharp/doublcov-web`: static Vue report explorer bundled into the CLI package.

## Workspace Extension Points

The core package contains extension APIs for applications that embed it from this workspace:

- `registerLanguageDefinition`
- `sourceExtensionsForLanguages`
- `registerDiagnosticParser`
- `buildCoverageBundle`
- `CoverageReportCustomization`

These APIs are useful when another tool wants to consume LCOV and build Doublcov-compatible report JSON. If `@0xdoublesharp/doublcov-core` becomes a published package, keep this list aligned with the public package exports.

## CLI Extension Boundary

The CLI includes builders for Foundry, Hardhat, Vitest, Jest, Node/V8 through c8, pytest, cargo-llvm-cov, cargo-tarpaulin, and lcov/gcov capture. Add new builders to this repository's internal registry. The CLI does not discover or install third-party builder packages, and there is no `doublcov plugin add` command or plugin package naming convention.

## Runtime Plugin Considerations

A runtime plugin system would need to define:

- package discovery, for example `doublcov.plugins` in `package.json`
- builder registration
- language registration
- diagnostic parser registration
- customization contributions
- version compatibility checks
- safe loading rules for local CI

A future builder plugin API should stay close to the internal model:

```ts
interface CoverageBuilderPlugin {
  id: string;
  aliases: string[];
  label: string;
  description: string;
  defaultLcov?: string;
  defaultSources?: string[];
  defaultExtensions?: string[];
  prepareRun(options: BuilderOptions): Promise<PreparedBuilderRun>;
}
```

## Adding Built-In Builder Integrations

Add built-in builders under:

```text
packages/cli/src/builders
```

Required steps:

1. Add a builder module.
2. Register it in `packages/cli/src/builders/registry.ts`.
3. Add argument/default tests in `packages/cli/test`.
4. Document it in `README.md` and `packages/cli/README.md`.
5. Add a fixture or smoke test if the builder has custom behavior.

## Adding Language Support

For core language detection, update:

```text
packages/coverage-core/src/languages.ts
```

For web syntax highlighting, update:

```text
apps/web/src/syntax.ts
```

Add representative fixtures under:

```text
fixtures/languages
```

and tests under:

```text
packages/coverage-core/test
```
