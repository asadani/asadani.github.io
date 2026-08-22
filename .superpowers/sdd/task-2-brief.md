## Global Constraints

- **Branch:** continue on `site-uplift` (the site-uplift work is unmerged; this folds into it).
- **Runtime:** Node 18, zero npm dependencies; `build.js` stays CommonJS.
- **Commit identity:** `asadani <anuj.k.sadani@gmail.com>` (no `Co-Authored-By`).
- **Colors via CSS variables only** — light `:root`, dark `[data-theme="dark"]`. Venue mapping: arXiv→`--red*`, SSRN→`--blue*`, Ko-fi→`--accent*`, Amazon→`--accent*`.
- **No `publications.json` schema change** — venue is derived at render time.
- **No monogram/logo** — venue badge is a text wordmark chip (`arXiv`/`SSRN`/`Ko-fi`/`Amazon`).
- **Arrow glyph:** literal `↗` for the external-link affordance (matches existing cards).
- **Escaping:** `esc()` for text content (publication fields are plain text), `escAttr()` for attribute values.
- **Do not touch** the article list, the equivalence gate, or any article page.

---

## Task 2: `.pubcard` CSS system in `site.css` (+ `--shadow` fix)

Remove the old three card rule sets, add the `.pubcard` + `.venue-badge` system, and define the missing `--shadow` variable (also fixes `.pillar-card:hover`).

**Files:**
- Modify: `assets/site.css`

- [ ] **Step 1: Define the missing `--shadow` variable in both themes**

In `assets/site.css`, in the `:root { … }` block, add this line immediately after the `--accent-border:` line:

```css
    --shadow:        rgba(200,92,45,0.08);
```

In the `[data-theme="dark"] { … }` block, add immediately after its `--accent-border:` line:

```css
    --shadow:        rgba(0,0,0,0.45);
```

Verify:
Run: `grep -c -- '--shadow:' assets/site.css`
Expected: `2`.

- [ ] **Step 2: Remove the old card rule sets**

Delete every CSS rule block whose selector targets the old cards. Concretely, remove all rules for these selectors (and their `:hover` / descendant variants):
`.pub-card`, `.pub-strip`, `.pub-body`, `.pub-top`, `.pub-badge`, `.pub-cat`, `.pub-id`, `.pub-title`, `.pub-authors`, `.pub-footer`, `.pub-date`, `.pub-link`,
`.book-card`, `.book-strip`, `.book-cover`, `.book-body`, `.book-title`, `.book-sub`, `.book-desc`, `.book-footer`, `.book-meta`, `.book-cta`,
`.store-card`, `.store-strip`, `.store-cover`, `.store-body`, `.store-badge`, `.store-title`, `.store-desc`, `.store-footer`, `.store-cta`.

**Keep** `.pub-bucket-label` and `.pub-self` (still used).

Verify (these selectors must be gone):
Run: `grep -cE '\.book-card|\.store-card|\.pub-card|\.book-strip|\.store-strip|\.pub-strip' assets/site.css`
Expected: `0`.
Run: `grep -c -- '.pub-bucket-label\|.pub-self' assets/site.css`
Expected: `≥ 2` (both kept).

- [ ] **Step 3: Add the `.pubcard` system**

Append to `assets/site.css`:

```css
/* ─── PUBLICATION CARD (unified 40:60 split) ──────────── */
.pubcard {
  display: flex; text-decoration: none; color: inherit;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; overflow: hidden; margin-bottom: 10px;
  transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
}
.pubcard:last-of-type { margin-bottom: 0; }
.pubcard:hover { box-shadow: 0 4px 22px var(--shadow); transform: translateY(-2px); border-color: var(--accent-border); }

.pubcard-media { flex: 0 0 40%; min-width: 120px; max-width: 240px; align-self: stretch; display: flex; }
.pubcard-cover { width: 100%; object-fit: cover; background: var(--bg-alt); border-right: 1px solid var(--border-light); }

.pubcard-panel {
  width: 100%; display: flex; flex-direction: column; justify-content: center; gap: 6px;
  padding: 18px; border-right: 1px solid var(--border-light); background: var(--accent-bg);
}
.pubcard-panel-venue { font-family: var(--mono); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; color: var(--accent); }
.pubcard-panel-cat { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
.pubcard-panel.venue-arxiv { background: var(--red-bg); }
.pubcard-panel.venue-arxiv .pubcard-panel-venue { color: var(--red); }
.pubcard-panel.venue-ssrn { background: var(--blue-bg); }
.pubcard-panel.venue-ssrn .pubcard-panel-venue { color: var(--blue); }

.pubcard-body { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 18px; }
.pubcard-title { font-family: var(--serif); font-size: 16.5px; font-weight: 600; line-height: 1.28; letter-spacing: -0.01em; color: var(--text); margin-bottom: 4px; }
.pubcard-sub { font-family: var(--sans); font-size: 12.5px; color: var(--text-muted); line-height: 1.45; margin-bottom: 7px; }
.pubcard-sub .pub-self { color: var(--accent); font-weight: 600; }
.pubcard-desc { font-family: var(--sans); font-size: 12.5px; color: var(--text-body); line-height: 1.55; margin-bottom: 10px; }
.pubcard-foot { display: flex; align-items: center; gap: 8px; margin-top: auto; }
.pubcard-meta { font-family: var(--mono); font-size: 10.5px; color: var(--text-subtle); }
.pubcard-arrow { margin-left: auto; font-size: 13px; color: var(--accent); }

/* venue wordmark chip */
.venue-badge {
  display: inline-flex; align-items: center; font-family: var(--mono);
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em;
  padding: 2px 7px; border-radius: 3px; border: 1px solid var(--border);
}
.venue-badge.venue-arxiv  { background: var(--red-bg);    color: var(--red);    border-color: var(--red-border); }
.venue-badge.venue-ssrn   { background: var(--blue-bg);   color: var(--blue);   border-color: var(--blue-border); }
.venue-badge.venue-kofi   { background: var(--accent-bg); color: var(--accent); border-color: var(--accent-border); }
.venue-badge.venue-amazon { background: var(--accent-bg); color: var(--accent); border-color: var(--accent-border); }

@media (max-width: 640px) {
  .pubcard { flex-direction: column; }
  .pubcard-media { flex-basis: auto; max-width: none; width: 100%; height: 160px; }
  .pubcard-cover { height: 160px; }
  .pubcard-panel { border-right: none; border-bottom: 1px solid var(--border-light); }
}
```

- [ ] **Step 4: Verify braces balance and key selectors exist**

Run: `test $(grep -c '{' assets/site.css) -eq $(grep -c '}' assets/site.css) && echo balanced`
Expected: `balanced`.
Run: `for s in .pubcard .pubcard-panel .pubcard-cover .venue-badge .pubcard-foot; do grep -q "$s" assets/site.css && echo "$s ok"; done`
Expected: all five `… ok`.

- [ ] **Step 5: Rebuild and run the full suite**

Run: `node build.js && node --test`
Expected: `index.html` regenerates; ALL tests PASS (publications now `.pubcard`, article equivalence still green).

- [ ] **Step 6: Manual visual spot-check (light + dark)**

Run: `python3 -m http.server 8000` → open `http://localhost:8000/#research`. Confirm:
- All six publications render as 40:60 split cards.
- Books/Ko-fi show cover art on the left; the two papers show a tinted venue panel (arXiv = red tint, with `arXiv` wordmark + `cs.CL`).
- Each foot row shows the correct venue chip (`Amazon` / `arXiv` / `Ko-fi`) + meta + `↗`.
- Hover lifts the card with a shadow; the hero pillar cards now also have a hover shadow.
- Toggle to dark mode (if available on the page) and confirm chips/panels read correctly.
Stop the server when done.

- [ ] **Step 7: Commit**

```bash
git add assets/site.css index.html
git commit -m "Replace book/pub/store card CSS with unified .pubcard system + venue chips; define --shadow"
```

---

