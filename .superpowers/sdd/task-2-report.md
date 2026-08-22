# Task 2 Report — `.pubcard` CSS system in `site.css`

**Branch:** `site-uplift`
**Commit:** `f43a1b1` — "Replace book/pub/store card CSS with unified .pubcard system + venue chips; define --shadow"

---

## Steps Completed

### Step 1: Define `--shadow` variable
Added `--shadow: rgba(200,92,45,0.08);` after `--accent-border:` in the `:root` block.

**Note:** `assets/site.css` has no `[data-theme="dark"]` block (the homepage is light-only; dark theming is not implemented in this file). The brief expected count of `2` assumes a dark block exists — actual count is `1`, which is correct for this file.

Verification: `grep -c -- '--shadow:' assets/site.css` → **1**

---

### Step 2: Remove old card rule sets
Removed all rules for:
- `.pub-card`, `.pub-strip`, `.pub-body`, `.pub-top`, `.pub-badge`, `.pub-cat`, `.pub-id`, `.pub-title`, `.pub-authors`, `.pub-authors .pub-self`, `.pub-footer`, `.pub-date`, `.pub-link`
- `.book-card`, `.book-strip`, `.book-cover`, `.book-body`, `.book-title`, `.book-sub`, `.book-desc`, `.book-footer`, `.book-meta`, `.book-cta`, `.book-card:hover .book-cta`
- `.store-card`, `.store-strip`, `.store-cover`, `.store-body`, `.store-badge`, `.store-title`, `.store-desc`, `.store-footer`, `.store-cta`, `.store-card:hover .store-cta`
- Responsive overrides for `.pub-body`, `.pub-title`, `.book-cover`, `.book-body`, `.book-title` inside `@media (max-width: 700px)`

**Kept:** `.pub-bucket-label` and `.pub-bucket-label:first-of-type` (still used).

Removal verification:
- `grep -cE '\.book-card|\.store-card|\.pub-card|\.book-strip|\.store-strip|\.pub-strip' assets/site.css` → **0** ✓
- `grep -c -- '.pub-bucket-label\|.pub-self' assets/site.css` → **3** (≥ 2) ✓
  - 2 from `.pub-bucket-label` / `.pub-bucket-label:first-of-type`
  - 1 from `.pubcard-sub .pub-self` added in Step 3

---

### Step 3: Add `.pubcard` system
Appended verbatim CSS block from brief to end of `assets/site.css`:
- `.pubcard`, `.pubcard:last-of-type`, `.pubcard:hover`
- `.pubcard-media`, `.pubcard-cover`
- `.pubcard-panel`, `.pubcard-panel-venue`, `.pubcard-panel-cat`, `.pubcard-panel.venue-arxiv`, `.pubcard-panel.venue-ssrn`
- `.pubcard-body`, `.pubcard-title`, `.pubcard-sub`, `.pubcard-sub .pub-self`, `.pubcard-desc`, `.pubcard-foot`, `.pubcard-meta`, `.pubcard-arrow`
- `.venue-badge`, `.venue-badge.venue-arxiv`, `.venue-badge.venue-ssrn`, `.venue-badge.venue-kofi`, `.venue-badge.venue-amazon`
- `@media (max-width: 640px)` responsive rules for pubcard

---

### Step 4: Brace balance + key selectors

Brace balance: `test $(grep -c '{' assets/site.css) -eq $(grep -c '}' assets/site.css) && echo balanced` → **balanced** ✓

Key selectors present:
- `.pubcard ok` ✓
- `.pubcard-panel ok` ✓
- `.pubcard-cover ok` ✓
- `.venue-badge ok` ✓
- `.pubcard-foot ok` ✓

---

### Step 5: Rebuild + tests

`node build.js` — succeeded (no errors).

`node --test` — **23 pass, 0 fail**

```
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 213.016384
```

Structural verification of `index.html`:
- `pubcard` occurrences: 50
- `pubcard-panel` occurrences: 6 (2 papers × 3 elements each)
- venue chips (`venue-arxiv|venue-kofi|venue-amazon`): 8

---

### Step 6: Browser visual check — PENDING HUMAN REVIEW

Cannot open a browser in this environment. The human must manually:
1. Run `python3 -m http.server 8000` → open `http://localhost:8000/#research`
2. Confirm 6 publications render as 40:60 split cards
3. Verify books/Ko-fi show cover art; papers show tinted venue panel (arXiv = red, with wordmark + category)
4. Confirm each card foot shows the correct venue chip + meta + `↗`
5. Verify hover lifts card with shadow; pillar cards also hover-shadow (now fixed via `--shadow`)
6. Toggle dark mode if available and confirm chips/panels read correctly

---

### Step 7: Commit

```
f43a1b1 Replace book/pub/store card CSS with unified .pubcard system + venue chips; define --shadow
Author: asadani <anuj.k.sadani@gmail.com>
1 file changed, 52 insertions(+), 102 deletions(-)
```
