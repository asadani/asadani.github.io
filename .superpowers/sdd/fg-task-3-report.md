# Task 3 Report — Flip-card CSS in `assets/site.css`

## Steps Done

### Step 1: Removed old `.pubcard` and `.venue-badge` rules
Deleted the following rule blocks from `assets/site.css`:
- `.pubcard` (base + `:last-of-type` + `:hover`)
- `.pubcard-media`, `.pubcard-cover`
- `.pubcard-panel`, `.pubcard-panel-venue`, `.pubcard-panel-cat`, and venue variants (`.venue-arxiv`, `.venue-ssrn`)
- `.pubcard-body`, `.pubcard-title`, `.pubcard-sub`, `.pubcard-desc`, `.pubcard-foot`, `.pubcard-meta`, `.pubcard-arrow`
- `.venue-badge` base + `.venue-badge.venue-arxiv`, `.venue-badge.venue-ssrn`, `.venue-badge.venue-kofi`, `.venue-badge.venue-amazon`
- The `@media (max-width: 640px)` block containing `.pubcard` overrides
- The `/* ─── PUBLICATIONS ───...` section comment placeholder

Also removed: the `/* ─── PUBLICATION CARD (unified 40:60 split) ──────────── */` comment.

**Kept:** `.pub-bucket-label`, `.pub-self` (referenced inside `.flipcard-back .pub-self`), `--shadow` variable, and all unrelated rules.

**Removal-verification grep outputs:**
```
$ grep -cE '\.pubcard|\.venue-badge' assets/site.css
0

$ grep -c -- '.pub-bucket-label\|.pub-self' assets/site.css
2
```

### Step 2: Appended flip-card CSS
Appended the complete `/* ─── PUBLICATION FLIP CARDS ──────────────────────────── */` block verbatim from the brief, including:
- `.flip-grid` responsive grid (3-up → 2-up → 1-up)
- `.flipcard` + `.flipcard-inner` 3D perspective + `is-flipped` state
- `.flipcard-face`, `.flipcard-back` (rotated 180deg), hover border/shadow
- `.flipcard-toggle` button styles (front and back variants)
- Front media: `.flipcard-cover`, `.flipcard-caption`
- Front text panel: `.flipcard-panel-venue`, `.flipcard-paneltitle`, `.flipcard-panel-cat`, venue-arxiv + venue-ssrn bg/color overrides
- Back: `.flipcard-desc`, `.flipcard-meta`, `.pub-self` accent override
- Venue link strip: `.flipcard-link` + hover + arxiv/ssrn color overrides
- `@media (prefers-reduced-motion: reduce)` fallback (opacity swap, no 3D rotate)

No dark-mode rules added (file is light-only, CSS variables only).

### Step 3: Verified braces + selectors, rebuilt, tested

**Brace balance:**
```
$ test $(grep -c '{' assets/site.css) -eq $(grep -c '}' assets/site.css) && echo balanced
balanced
```

**Five selector-presence checks:**
```
.flip-grid ok
.flipcard-inner ok
.flipcard-cover ok
.flipcard-paneltitle ok
.flipcard-link ok
```

**Build + tests:**
```
$ node build.js && node --test
# tests 24
# pass 24
# fail 0
# duration_ms ~279ms
```
All 24 tests pass.

### Step 4: Committed

Commit hash: `08d0877`
Message: `Replace .pubcard CSS with flip-card grid + 3D flip + reduced-motion`

## Concerns

None. The removal was clean, verification greps match expected values, brace count is balanced, all selectors present, build regenerates cleanly, and all 24 tests pass.
