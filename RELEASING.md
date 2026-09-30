# Release plan

Desktop Widgets follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Change | Bump | Example |
|---|---|---|
| Bug fix, tweak, dependency update | PATCH | 2.0.0 → 2.0.1 |
| New widget or feature, backward compatible | MINOR | 2.0.1 → 2.1.0 |
| Breaking change (e.g. config format) | MAJOR | 2.1.0 → 3.0.0 |
| Pre-release / testing build | suffix | 2.1.0-beta.1 |

## Pipeline

| Trigger | Workflow | Result |
|---|---|---|
| Push or PR to `main` | `ci.yml` | Type-check, build, package the installer. Installer is attached to the run as an artifact (14 days). |
| Push a tag `vX.Y.Z` | `release.yml` | Same checks, then publishes a GitHub Release with `Desktop-Widgets-Setup-X.Y.Z.exe` and auto-generated notes. Tags containing `-` (e.g. `-beta.1`) are marked pre-release. |

## Cutting a release

1. Make sure `main` is green in the Actions tab.
2. Smoke-test the installer from the latest CI run (see checklist below).
3. Bump the version: `npm version minor` (or `patch` / `major` / `preminor --preid=beta`).
   This edits `package.json`, commits, and creates the `vX.Y.Z` tag.
4. Push: `git push origin main --follow-tags`.
5. The **Release** workflow builds and publishes. Edit the release notes on GitHub if needed.
6. Update the version in the README install instructions if they reference a specific number.

The workflow refuses to publish if the tag and `package.json` version differ.

## Pre-release smoke test (Windows 10 and 11)

- [ ] Installer runs, creates Start menu and desktop shortcuts, app starts.
- [ ] Widgets appear on the desktop and sit **behind** normal app windows.
- [ ] Win + D / Show Desktop keeps the widgets visible.
- [ ] Desktop right-click menu, tray flyout and tray menu do not make widgets vanish.
- [ ] Drag, resize, Edit Widgets mode, gallery, Smart Stack work.
- [ ] Settings open from the tray and the Start menu; changes persist after restart.
- [ ] Start with Windows turns on after first launch; uninstall removes the app and keeps user data.

## Known limitations / next steps

- **Code signing:** builds are unsigned, so Windows SmartScreen shows a warning on first run. Add a certificate and set `CSC_LINK` / `CSC_KEY_PASSWORD` repository secrets, then drop `CSC_IDENTITY_AUTO_DISCOVERY: "false"` from the workflows.
- **Auto-update:** not implemented. Adding `electron-updater` with `--publish always` would let installed apps update from GitHub Releases.
- **Automated tests:** CI currently type-checks and builds. Unit tests for `src/lib/layout.ts` (Vitest) would be the first addition.
- **Arm64 / portable builds:** only x64 NSIS is produced today.
