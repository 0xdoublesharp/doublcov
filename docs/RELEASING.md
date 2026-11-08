# Releasing

Release Doublcov by merging the version change, then pushing an annotated version tag. GitHub Actions verifies the code and publishes every release channel. For installation and usage, see the [README](../README.md); for report hosting, see [CI And Hosting](CI.md).

## Release Channels

Each stable release tag (`v*.*.*`) publishes to these channels:

| Channel         | Artifact                                                 |
| --------------- | -------------------------------------------------------- |
| npm             | `@0xdoublesharp/doublcov`                                |
| GitHub Releases | per-platform binaries + `SHA256SUMS`                     |
| GitHub Action   | [`action.yml`](../action.yml) (downloads release binary) |
| GHCR            | `ghcr.io/0xdoublesharp/doublcov:<tag>` and `:latest`     |

Additional install channels should consume the tagged GitHub Release binaries and checksums.

Images for v0.4.5 and earlier remain under the previous `doublesharp` GHCR namespace. Later releases publish only to `ghcr.io/0xdoublesharp/doublcov`.

## Cut a Release

1. Update the versions in `apps/web/package.json`, `packages/cli/package.json`, and `packages/coverage-core/package.json` together.
2. Add the release to `CHANGELOG.md` and update pinned binary versions in the README and CI examples.
3. Run `pnpm run verify:publish` and `pnpm run test:e2e`. Commit the changes, open a pull request, and merge after CI passes.
4. From the merged `main` commit, create and push the version tag:

   ```bash
   git switch main
   git pull --ff-only
   git tag -a v0.4.6 -m "Release v0.4.6"
   git push origin v0.4.6
   ```

5. Check that the Release workflow succeeds. Confirm the npm version, five binaries and checksums, both container architectures, and the updated `v0` Action tag before announcing the release.

## Release Workflow

Tagged stable semver pushes (`v*.*.*`) trigger [`.github/workflows/release.yml`](../.github/workflows/release.yml). Release tags are immutable version tags such as `v0.3.0`; moving major tags such as `v0` are maintained by the workflow and must not create releases themselves. The release jobs are:

1. **`verify`** — `pnpm run verify:publish` (build + typecheck + tests + npm-pack smoke).
2. **`binary`** — matrix across `linux-x64`, `linux-arm64`, `macos-x64`, `macos-arm64`, `windows-x64`. Each runner builds its native standalone binary.
3. **`github-release`** — collects binary artifacts, generates `SHA256SUMS`, creates the GitHub Release with notes from `CHANGELOG.md`.
4. **`npm`** — installs the latest npm CLI and publishes `@0xdoublesharp/doublcov` with trusted-publishing provenance.
5. **`container`** — builds and pushes the multi-arch image to GHCR as `ghcr.io/<owner>/doublcov`, using the repository owner in lowercase.
6. **`container-manifest`** — publishes the multi-arch `:<tag>` and `:latest` image manifests.
7. **`major-tag`** — after the release, npm, and container publish succeed, force-updates the moving major tag (`v0` for `v0.x.y`) to the released commit.

Pull requests and `main` pushes run [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (`verify:publish` and browser tests, no release artifacts).

## Action Major Tags

The GitHub Action should be documented with a moving major tag:

```yaml
- uses: 0xdoublesharp/doublcov@v0
```

The workflow updates `v0` after every successful stable `v0.x.y` release. Do not manually publish a GitHub Release for `v0`; it is only an action convenience tag.

Use the action `version` input to control which Doublcov binary the action downloads:

```yaml
- uses: 0xdoublesharp/doublcov@v0
  with:
    version: v0.4.6
```

Omit `version` to download the latest GitHub Release binary. Pin `version` in reproducible CI examples; omit it in quick-start examples where following the latest release is acceptable.

## Local Dry Run

```bash
pnpm install --frozen-lockfile
pnpm run verify:publish
npm publish ./packages/cli --access public --dry-run --ignore-scripts
pnpm run build:binary   # produces packages/cli/dist/bin/<host-binary>
```

The workflow publishes through npm trusted publishing with an OIDC token and provenance from GitHub Actions. Use `--dry-run` for local package checks; publish releases through the workflow.

## Artifact Details

**Binaries** are SEA-built single files with the web explorer assets embedded. Names:

- `doublcov-linux-x64`
- `doublcov-linux-arm64`
- `doublcov-windows-x64.exe`
- `doublcov-macos-x64`
- `doublcov-macos-arm64`

Builder subcommands still require their underlying tool on `PATH` (e.g. `doublcov forge` requires Foundry).

**Container** is built from [`Dockerfile`](../Dockerfile) on Node 22 Alpine. It ships the bundled CLI under `/opt/doublcov/dist` with a shim at `/usr/local/bin/doublcov`; it is not the SEA binary. Entrypoint `doublcov`, workdir `/work`.

**GitHub Action** is implemented by [`scripts/github-action.mjs`](../scripts/github-action.mjs). Inputs: `version`, `repository`, `command`, `args`, `install-only`. Output: `path`. Use the moving major action ref (`0xdoublesharp/doublcov@v0`) for compatible action updates, and pin the downloaded CLI binary with the `version` input when reproducibility matters.

## Core Package

`@0xdoublesharp/doublcov-core` is marked `private: true` in the workspace. Publish only when external consumers need the LCOV parser/report model API. To publish: remove `private`, add full package metadata, and keep CLI and core versions aligned until the API stabilizes.

## Fixture report previews

After installing dependencies, build the CLI and generate standalone sample reports:

```bash
pnpm run build
pnpm run showcase:reports
```

Open `coverage/showcases/index.html` to browse the Solidity, Rust, TS/JS, and mixed-language fixtures. The command regenerates `coverage/showcases`; these are local preview artifacts and are not published with the npm package.
