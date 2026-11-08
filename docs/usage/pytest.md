# pytest

Run `doublcov pytest` to collect Python coverage and build a report. The aliases `python` and `coverage.py` use the same builder, which runs `python -m pytest --cov --cov-report=lcov:<path>`.

## Prerequisites

- Python 3.8+ with [`pytest`](https://docs.pytest.org/) and [`pytest-cov`](https://pytest-cov.readthedocs.io/) installed
- Node 22+ to run the Doublcov CLI

```bash
pip install pytest pytest-cov
```

`pytest-cov` is a wrapper around [`coverage.py`](https://coverage.readthedocs.io/), which provides the LCOV reporter used here.

## Install

```bash
npm install --save-dev @0xdoublesharp/doublcov
```

Or:

```bash
pnpm add -D @0xdoublesharp/doublcov
```

## Quick start

```bash
doublcov pytest
```

Default output: `coverage/report`, unless coverage.py or Doublcov config resolves a different LCOV/report path. Local runs open the report by default.

## Passing arguments to pytest

Forward arguments after `--`:

```bash
doublcov pytest -- -k "not slow" tests/unit
```

## Project scripts

Use a Makefile to keep local and CI commands together:

```make
.PHONY: coverage
coverage:
	npx @0xdoublesharp/doublcov pytest

.PHONY: coverage-ci
coverage-ci:
	npx @0xdoublesharp/doublcov pytest --no-open
```

Or a `justfile`:

```text
coverage:
    npx @0xdoublesharp/doublcov pytest

coverage-ci:
    npx @0xdoublesharp/doublcov pytest --no-open
```

Doublcov reads `[tool.coverage.lcov] output` from `pyproject.toml` when present.

## Manual LCOV path

```bash
python -m pytest --cov --cov-report=lcov:coverage/lcov.info
doublcov build \
  --lcov coverage/lcov.info \
  --sources src \
  --extensions py,pyw \
  --out coverage/report
```

## CI snippet

```yaml
- uses: actions/setup-python@v7
  with:
    python-version: "3.12"
- uses: actions/setup-node@v7
  with:
    node-version: 22
- run: pip install -e . pytest pytest-cov
- run: npx @0xdoublesharp/doublcov pytest
- uses: actions/upload-artifact@v7
  with:
    name: coverage-report
    path: coverage/report
```

## Troubleshooting

- **`--cov` measures nothing.** Configure the source package in `pyproject.toml` (`[tool.coverage.run] source = ["mypkg"]`) or pass `--cov=mypkg` after `--`.
- **LCOV reporter not recognized.** The LCOV reporter requires `coverage.py` 7.2 or newer. Upgrade `pytest-cov`/`coverage`.
- **Namespace packages.** Set `[tool.coverage.run] relative_files = true` so reported paths line up with `--sources`.
