# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Hostly

A cross-platform desktop application for managing system hosts files, built with **Go + Wails v2** (backend) and **React + Vite** (frontend). No REST API — all communication is via Wails IPC.

## Commands

### Full Application (requires Wails CLI)

```bash
# Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0

wails dev      # Dev mode with Go + React hot reload
wails build    # Production binary
```

### Frontend only

```bash
cd frontend
npm install
npm run dev    # Vite dev server
npm run build  # Output to frontend/dist
```

### Go tests

```bash
go test ./...              # All tests
go test ./hosts/...        # Hosts parsing/planning tests only
go test ./hosts/ -run TestFunctionName  # Single test
```

## Architecture

### Backend (`app.go` + packages)

**`app.go`** — Wails binding layer. The `App` struct methods are exposed directly to the frontend via `window.go.main.App.*`. Lifecycle: `startup` initializes SQLite, `shutdown` closes it.

**`hosts/`** — Pure parsing and planning logic (no I/O side effects except `ApplyPlanToFile`):
- `ParseHostsFile(path)` → `HostsFile` with line-numbered entries, disabled-entry detection, IP validation
- `planner.go` — Takes a hosts file + group selections, detects conflicts (same hostname → multiple active IPs), returns a line-level `Plan` (activate/deactivate/ignore/reject actions) and a `ReviewSummary` for the UI preview step
- `ApplyPlanToFile(path, plan)` — Writes changes back; requires elevated privileges

**`storage/`** — SQLite via `modernc.org/sqlite`. DB lives at `~/.config/hostly/storage/hostly.db`.
- Schema: `app_settings` (key-value), `host_groups`, `host_group_entries` (FK → group with CASCADE delete)
- WAL mode enabled; all mutations use transactions

### Frontend (`frontend/src/`)

**`layouts/MainLayout.jsx`** — Central state orchestrator. Owns all React state: hosts entries, groups, selections, dialog visibility. Calls backend IPC and threads results down to children.

**`lib/backend.js`** — Thin async wrappers around `window.go.main.App.*`. All backend calls go through here.

**Component flow:**
1. User loads/selects hosts file → `SelectHostsFile` IPC
2. User picks groups, edits entries
3. Preview → `PreviewHostsSelection` IPC → returns `Plan` + summary → shown in `CommitDialog`
4. Confirm → `ApplyHostsPlan` IPC writes to disk

**Styling:** Adobe React Spectrum S2 (`@react-spectrum/s2`) with compile-time CSS macros via `unplugin-parcel-macros`. The `style()` macro runs at build time — import from `@react-spectrum/s2/style`.

### Platform-specific hosts paths (resolved in `app.go`)

| Platform | Path |
|----------|------|
| macOS | `/private/etc/hosts` (fallback: `/etc/hosts`) |
| Linux | `/etc/hosts` |
| Windows | `C:\Windows\System32\drivers\etc\hosts` |

## Key Patterns

- **Conflict detection**: `planner.go` groups entries by hostname; same hostname with different active IPs = conflict. Planner proposes deactivating conflicts.
- **Plan-then-apply**: Changes are never written directly. Always generate a `Plan` first, show the user a diff-like preview, then apply.
- **Table-driven Go tests**: Test files in `hosts/` use `[]struct{...}` test cases with `t.Run`.
- **No linting tools** are configured. No ESLint, Prettier, or golangci-lint.

## Release

Tagged pushes (`v*`) trigger `.github/workflows/release.yml`, which builds for Linux (Ubuntu 22.04), macOS, and Windows using `wails build` and uploads binaries to GitHub Releases.
