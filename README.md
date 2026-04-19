# Weekly Slot Planner — Expressway

A single-file drag-and-drop planner for allocating 30-minute work slots across the week.
Designed around a 16hr/week part-time schedule: 50 slots available (10/day × 5 days), 32-slot quota.

## Quick start

Open `Weekly Planner.html` directly in any modern browser. No build step, no dependencies.

To host it:

- **GitHub Pages** — push to `main`, enable Pages in Settings → Pages → "Deploy from branch: main / root"
- **Cloudflare Pages** — connect the repo, build command: *(none)*, output dir: *(root)*
- **Netlify / Vercel** — drop the folder in, same story

## Features

- 9 colour-coded categories (drag from the left palette onto any slot)
- Drag to move, drag to swap, drag the "Clear" tile to erase
- Per-slot notes with autosave — small dot on a chip marks which slots have notes
- Live per-category totals (count + hours) and a quota progress bar (32/50)
- Templates — save a week as a reusable template; "Copy Monday → all days"
- Time bands: 07:00–09:00, 10:00–12:00, 16:00–17:00 (gaps shown hatched)

## Storage

Everything is stored client-side in `localStorage` under these keys:

- `expressway.weekly.v1` — the current week (slots + notes + selection)
- `expressway.weekly.templates.v1` — saved templates

**Implications:**
- Data is private to the browser on that device. Not synced across devices.
- Clearing site data wipes the plan. Export/import is not yet implemented.
- No server, no account, no cost.

## Upgrade paths

If you outgrow localStorage (e.g. want phone + laptop sync, or historical reporting):

### Option A — Cloudflare Worker + D1 (recommended next step)

Single-repo stack:
- `Weekly Planner.html` served via Cloudflare Pages
- A Worker at `/api/*` backed by D1 (SQLite) for persistence
- Simple shared-secret auth via `Authorization: Bearer <token>` for a solo user

Rough schema:

```sql
CREATE TABLE weeks (
  week_key   TEXT PRIMARY KEY,   -- e.g. "2026-W17"
  payload    TEXT NOT NULL,      -- JSON blob of { mon: [...], tue: [...], ... }
  updated_at INTEGER NOT NULL
);

CREATE TABLE templates (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

Endpoints:
- `GET  /api/week/:weekKey` → returns the week JSON (or empty week)
- `PUT  /api/week/:weekKey` → upserts the week
- `GET  /api/templates`     → list
- `POST /api/templates`     → create
- `DELETE /api/templates/:id` → remove

Client changes:
- Replace the `localStorage` reads/writes with `fetch()` calls
- Debounce PUTs on the week (e.g. 500ms after last change)
- Fall back to `localStorage` for offline edits and reconcile on reconnect

### Option B — GitHub Gist / Git-backed

If you already use GitHub heavily, persist the week JSON as a gist. Cheaper to build, but you lose the "open it anywhere" flow.

### Option C — Supabase / Firebase

Overkill for a solo planner but trivial if you're already in that ecosystem.

## Roadmap ideas

- Export/import JSON (solves the "move devices once" case without a backend)
- Week navigation (prev / next week, keyed by ISO week)
- Slot-level history so notes aren't lost when a slot is re-categorised
- Dark mode
- Print stylesheet for a paper copy

## File map

```
Weekly Planner.html   # The whole app: HTML + CSS + JS in one file
README.md             # This file
```
