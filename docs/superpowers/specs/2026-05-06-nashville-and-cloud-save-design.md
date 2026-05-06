# Nashville Notation, New Score, and ph-apps Cloud Save — Design

**Date:** 2026-05-06
**Status:** approved

## Summary

Three connected pieces of work:

1. **Nashville notation toggle (bug fix + UX redesign).** The current Standard/Nashville toolbar toggle does nothing visible; existing chord data shows whichever field is populated regardless of `meta.notationType`. Replace the binary toggle with a 3-state cycle that controls *display* (chord symbols, Nashville numbers, or both). Conversion is derived from `meta.key` when no Nashville data exists.

2. **New Score button + overlay.** No way currently exists to start a fresh chart. Add a toolbar button and Cmd/Ctrl+N shortcut that opens an overlay offering: save to ph-apps account (active when logged in), export JSON, continue without saving, or cancel.

3. **OTP login + cloud save via ph-apps.** Port the proven drumlet OTP flow against `apps.pepperhorn.com`, add a Save / Open-from-account workflow backed by the existing `app_user_saves` Directus collection.

Plugin library / library plugin work is **out of scope** for this spec.

---

## A. Nashville notation (3-state display)

### Behavior

A single toolbar button cycles through three display states:

| State | Chord symbols | Nashville numbers | Notes |
|---|---|---|---|
| 1. **Chords** (default) | full size, `#000` | hidden | current default look |
| 2. **Chords + Nashville** | full size, `#000` | shown above chord, ~70% size, muted (`slate-500`-ish) | secondary line |
| 3. **Nashville only** | hidden | full size, `#000`, in chord position | primary line |

Button label cycles "Chords" → "Chords + Nashville" → "Nashville". `active` state visually distinguishes Nashville-bearing modes from plain Chords.

### Data model

Replace the existing `meta.notationType: "standard" | "nashville"` with `meta.notationDisplay: "chords" | "both" | "nashville"`. This is purely a display preference — `slot.chord` and `slot.nashvilleChord` remain side-by-side in the data model; toggling does **not** rewrite chord data.

Migration: legacy charts with `notationType: "nashville"` map to `notationDisplay: "nashville"`; otherwise `"chords"`.

### Conversion rule

When a Nashville number is needed for a slot:
- If `slot.nashvilleChord` is set, render it directly.
- Else if `slot.chord` is set, derive Nashville from `slot.chord` + `meta.key` (the chart tonic, **not** the first chord). Pure function `chordToNashville(chord, key) → NashvilleChord`.

When a chord symbol is needed:
- If `slot.chord` is set, render it.
- Else if `slot.nashvilleChord` is set, render `nashvilleToChord(nashville, key)`.

Conversion is display-only and lossless: toggling back returns to identical visual output.

### Layout impact (option B — per-line)

The Nashville row above chord symbols only adds vertical space on lines that contain at least one chord. Implementation: in `src/lib/layout/engine.ts`, after line-breaking, compute `line.hasChords` and inflate that line's vertical band by `nashvilleRowHeight` only when `notationDisplay === "both"` AND `line.hasChords`. State `"nashville"` reuses the existing chord row position (no inflation needed).

The engine cache key incorporates `notationDisplay` so toggling re-flows correctly.

### Toolbar button

Replaces the existing "Notation: Standard/Nashville" button at the same location in `src/components/chord-chart/Toolbar.tsx`. `className="btn-notation-display"`.

---

## B. New Score button + overlay

### Toolbar button

Placed *before* the import/export controls. Bold icon (`FilePlus` from lucide-react). `className="btn-new-score"`. Shortcut **Cmd/Ctrl+N** (preventDefault on the browser default).

### Overlay (Radix Dialog)

Triggered by button click or shortcut. Skipped entirely (and a fresh chart created directly) if the current chart is unchanged from the empty/initial state — detected via undo-stack depth = 0 AND chart deep-equals `createEmptyChart()` skeleton.

Overlay contents:

- **Save to your account** — primary button. Disabled when not logged in, with subtext "Login required — coming soon when you sign in." When logged in: triggers cloud save (see §D), then on success replaces store with `createEmptyChart()` and dismisses dialog.
- **Export current chart (JSON)** — secondary. Downloads via existing `src/lib/io.ts` pipeline. Then replaces store with `createEmptyChart()` and dismisses.
- **Continue without saving** — destructive style. Replaces store, dismisses.
- **Cancel** — closes dialog, no changes.

### Files

- `src/components/chord-chart/NewScoreDialog.tsx` — new component
- Wire button + shortcut in `Toolbar.tsx`

---

## C. OTP login (ph-apps)

Port drumlet's auth pattern verbatim, with `app_slug = "chordee"`.

### Files

- `src/lib/auth/useAuth.ts` — three Directus flow calls on `https://apps.pepperhorn.com/flows/trigger/`:
  - `FLOW_SEND_CODE = '40f96a57-1ab0-4031-a7f5-9a32ec877d15'`
  - `FLOW_VERIFY_CODE = '65da02e3-4742-4c5a-8bc5-3bb114fb6557'`
  - `FLOW_VERIFY_SESSION = '11dd60ca-fc66-4396-9461-858b7bbf2df8'`
  - localStorage key: `chordee-session-token`
  - Exposes `{ user, isLoggedIn, isLoading, requestOtp, verifyOtp, updateProfile, logout }`
- `src/components/auth/AuthModal.tsx` — email → 6-digit OTP → optional first/last name. Persist in-flight flow under `chordee-auth-flow` (10-minute expiry).
- `src/components/auth/AccountButton.tsx` — toolbar button. When logged out: shows "Sign in" → opens AuthModal. When logged in: shows user email/initial → opens dropdown with Logout. Placed at the right edge of the top toolbar (same area as the existing About button).

These components live in their own folder so they can later be lifted into a shared `@pepperhorn/auth` package.

---

## D. Cloud Save / Open from account

### `app_user_saves` mapping

| Field | Value |
|---|---|
| `app_user` | from session (`user.id`) |
| `app_slug` | `"chordee"` |
| `kind` | `"chart"` |
| `external_id` | `chart.meta.id` (chart-stable uuid; see §E) |
| `name` | `chart.meta.title || "Untitled"` |
| `payload` | full `ChordChart` JSON |
| `status` | `"published"` |

Save is an upsert keyed by `(app_user, app_slug, kind, external_id)`. Implementation: GET filtered by those four fields; if a row exists, PATCH it; else POST.

### Files

- `src/lib/cloudSave.ts` — exports `saveChart(chart, token)`, `listCharts(token)`, `loadChart(externalId, token)`, `deleteChart(externalId, token)`. All call `https://apps.pepperhorn.com/items/app_user_saves` with `Authorization: Bearer <token>`.
- `src/components/chord-chart/CloudOpenDialog.tsx` — list user's chordee saves (name, last updated). Click a row to load into store.

### Toolbar wiring

- **Save** button — new, before export. Cmd/Ctrl+S. If logged in: cloud save with toast feedback. If not: open AuthModal, then after successful login, complete the save.
- **Open from account** entry — added near the existing local-file Open. Opens `CloudOpenDialog`. Disabled when not logged in (with tooltip).

The local-file Save/Open continues to work unchanged.

### Schema chart id (§E)

Add `id: z.string().uuid()` to `ChartMetaSchema` in `src/lib/schema.ts`. Default to `crypto.randomUUID()`. On chart load (Zod parse in `io.ts` and elsewhere), backfill missing `meta.id` with a fresh uuid before rendering — keeps legacy charts working.

---

## E. ph-apps Directus change

Add `"chart"` to the `kind` field's dropdown choices on the `app_user_saves` collection (currently: `patch`, `pattern`, `preset`, `kit`). One-time admin operation via the ph-apps MCP `fields` tool.

---

## Out of scope (future)

- Plugin library / library plugin (separate spec).
- Conflict resolution if the same chart is edited from two devices (last-write-wins for v1).
- Sharing charts with other users.
- Folder/tag organization in the cloud picker.

## Acceptance criteria

- [ ] Nashville toggle cycles 3 states; lines with chords inflate when in "both"; state 3 shows only Nashville at full size in the chord position.
- [ ] Conversion uses `meta.key` as tonic; toggling back is visually identical to the original.
- [ ] New Score button + Cmd/Ctrl+N opens overlay; overlay actions work; unmodified charts skip the dialog.
- [ ] User can sign in via email OTP and stay logged in across page reloads.
- [ ] Save to account writes to `app_user_saves` and upserts on subsequent saves of the same chart.
- [ ] Open from account lists the user's chordee saves and loads the selected one.
- [ ] `npx astro check` passes.
