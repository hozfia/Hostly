# Hostly

**A desktop app for managing your system hosts file — without the manual editing.**

Hostly gives developers and sysadmins a clean interface to activate, deactivate, edit, and organize hosts entries. It detects conflicts automatically, previews every change before writing to disk, and requires elevated privileges only at the moment it applies changes.

> **Beta** — functional and in active development. Feedback and contributions welcome.

---

## Features

**Plan before you write**
Every change goes through a review step. Hostly shows you exactly what will be activated, deactivated, or added before anything touches the file.

**Conflict detection**
If two entries map different IPs to the same hostname, Hostly flags the conflict and proposes a fix — deactivating the conflicting line automatically.

**Edit entries in place**
Select any row, click Edit, change the IP or hostnames, and commit. The original line is rewritten — no duplicate lines left behind.

**Groups**
Bundle related entries together and toggle them as a unit. Useful for switching between environments (local dev, staging, VPN).

**Add entries**
Add single entries with validated fields, or paste a block of raw hosts syntax for bulk import.

**Search**
Filter entries and groups live as you type.

**Cross-platform**
Runs on macOS, Linux, and Windows.

---

## Download

Grab the latest binary from the [Releases](../../releases) page — no dependencies required.

| Platform | File |
|----------|------|
| macOS | `hostly-darwin.zip` |
| Linux | `hostly-linux.zip` |
| Windows | `hostly-windows.zip` |

> Applying changes to the hosts file requires administrator/root privileges. Hostly will prompt for elevation at commit time — not before.

---

## Build from source

**Prerequisites:** Go 1.21+, Node.js 18+, Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0

git clone https://github.com/hozfia/Hostly.git
cd Hostly
wails dev       # dev mode with hot reload
wails build     # production binary
```

---

## How it works

1. **Load** — Hostly reads your system hosts file and parses every entry.
2. **Select** — Pick entries from the table or add them by group. Toggle active/inactive per item.
3. **Preview** — Generate a diff-like plan showing each line's fate: `ACTIVATE`, `DEACTIVATE`, `UPDATE`, `IGNORE`, or `REJECT`.
4. **Commit** — Confirm, and Hostly rewrites only the affected lines.

Groups and selections are persisted locally (SQLite) so your workspace survives restarts.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Wails v2 |
| Frontend | React + Vite |
| UI components | Adobe React Spectrum S2 |
| Storage | SQLite (`modernc.org/sqlite`) |
| IPC | Wails bindings (no REST API) |

---

## Contributing

Issues and pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

MIT
