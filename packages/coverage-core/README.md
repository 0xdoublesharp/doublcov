# @0xdoublesharp/doublcov-core

Parse LCOV and build the report model shared by the Doublcov CLI and web viewer.

The core parses LCOV, detects source languages, applies ignored-line rules, attaches diagnostics, and appends coverage history. Coverage tools run through the CLI's builders.

## Workspace API

- `parseLcov(input)` parses LCOV records, preserving optional function end lines and the aliases of LCOV 2.2 function groups.
- `buildCoverageBundle(input)` builds report JSON and source payloads.
- `appendHistoryRun(history, report, metadata)` appends a coverage-history point.
- `registerLanguageDefinition(definition)` registers language detection and ignored-line rules for embedders.
- `sourceExtensionsForLanguages()` returns extensions from the current language registry.
- `registerDiagnosticParser(parser)` registers parser-tagged diagnostic inputs for embedders.
- `CoverageReportCustomization` describes safe theme tokens and declarative UI hook contributions.

## Package Boundaries

This package is private and its registries are available to workspace packages. External projects should use the published `@0xdoublesharp/doublcov` CLI. Publishing the core separately would require package metadata and stable exports. The CLI includes its own builders and does not load third-party builder packages.

Customization metadata is declarative JSON. It is meant for static report rendering and should not be treated as executable plugin code.
