## Global Constraints

- **Branch:** continue on `site-uplift` (unmerged; folds into the in-flight work).
- **Runtime:** Node 18, zero npm dependencies; `build.js` stays CommonJS; tests run with `node --test`.
- **Commit identity:** `asadani <anuj.k.sadani@gmail.com>`; no `Co-Authored-By`; commit with `--no-verify`.
- **Colors via CSS variables only.** `site.css` is the HOMEPAGE stylesheet and is **light-only** (no `[data-theme="dark"]` block) — do not add dark rules to it. Venue colors: arXiv→`--red*`, SSRN→`--blue*`, Ko-fi/Amazon→`--accent*`.
- **No new dependencies.** Flip is CSS 3D transform + one delegated vanilla-JS listener.
- **Escaping:** `esc()` for text content (publication fields are plain text), `escAttr()` for attribute values. Literal `↗` glyph.
- **Accessibility:** the flip toggle is a real `<button>` with `aria-expanded`; `prefers-reduced-motion` must avoid the 3D rotate.
- **Do not touch** the article list, the equivalence gate, or any article page.

---

## Task 3: Flip-card CSS in `site.css`

Remove the `.pubcard` rules; add the flip-grid + 3D flip system + venue colors + reduced-motion fallback.

**Files:**
- Modify: `assets/site.css`

- [ ] **Step 1: Remove the old `.pubcard` rules**

Delete every rule block whose selector starts with `.pubcard` (e.g. `.pubcard`, `.pubcard-media`, `.pubcard-cover`, `.pubcard-panel`, `.pubcard-panel-venue`, `.pubcard-panel-cat`, `.pubcard-body`, `.pubcard-title`, `.pubcard-sub`, `.pubcard-desc`, `.pubcard-foot`, `.pubcard-meta`, `.pubcard-arrow`) and the `.venue-badge` chip rules (`.venue-badge`, `.venue-badge.venue-arxiv`, `.venue-badge.venue-ssrn`, `.venue-badge.venue-kofi`, `.venue-badge.venue-amazon`).

**Keep** `.pub-bucket-label`, `.pub-self`, `--shadow`, and everything else.

Verify:
Run: `grep -cE '\.pubcard|\.venue-badge' assets/site.css`
Expected: `0`.
Run: `grep -c -- '.pub-bucket-label\|.pub-self' assets/site.css`
Expected: `≥ 2`.

- [ ] **Step 2: Append the flip-card system**

Append to `assets/site.css`:

```css
/* ─── PUBLICATION FLIP CARDS ──────────────────────────── */
.flip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 8px; }
@media (max-width: 900px) { .flip-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .flip-grid { grid-template-columns: 1fr; } }

.flipcard { perspective: 1000px; }
.flipcard-inner {
  position: relative; width: 100%; aspect-ratio: 3 / 4;
  transition: transform 0.5s; transform-style: preserve-3d;
}
.flipcard.is-flipped .flipcard-inner { transform: rotateY(180deg); }

.flipcard-face {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
  overflow: hidden; -webkit-backface-visibility: hidden; backface-visibility: hidden;
}
.flipcard-back { transform: rotateY(180deg); }
.flipcard:hover .flipcard-face { border-color: var(--accent-border); box-shadow: 0 4px 22px var(--shadow); }

.flipcard-toggle {
  flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column;
  align-items: stretch; gap: 8px; padding: 0; border: none; background: none;
  cursor: pointer; text-align: left; font: inherit; color: inherit;
}
.flipcard-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.flipcard--text .flipcard-front .flipcard-toggle { padding: 20px 16px; justify-content: center; align-items: center; text-align: center; gap: 10px; }
.flipcard-back .flipcard-toggle { padding: 16px; gap: 8px; justify-content: flex-start; }

/* front: media (cover + caption) */
.flipcard-cover { width: 100%; flex: 1; min-height: 0; object-fit: cover; background: var(--bg-alt); }
.flipcard-caption { flex-shrink: 0; padding: 10px 14px; font-family: var(--serif); font-size: 14px; font-weight: 600; line-height: 1.3; color: var(--text); }

/* front: paper title panel */
.flipcard-panel-venue { font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
.flipcard-paneltitle { font-family: var(--serif); font-size: 18px; font-weight: 600; line-height: 1.3; color: var(--text); }
.flipcard-panel-cat { font-family: var(--mono); font-size: 10.5px; color: var(--text-muted); }
.flipcard--text.venue-arxiv .flipcard-front { background: var(--red-bg); }
.flipcard--text.venue-arxiv .flipcard-panel-venue { color: var(--red); }
.flipcard--text.venue-ssrn .flipcard-front { background: var(--blue-bg); }
.flipcard--text.venue-ssrn .flipcard-panel-venue { color: var(--blue); }

/* back: desc + meta */
.flipcard-desc { font-family: var(--sans); font-size: 12.5px; color: var(--text-body); line-height: 1.5; }
.flipcard-meta { font-family: var(--mono); font-size: 10.5px; color: var(--text-muted); line-height: 1.4; }
.flipcard-back .pub-self { color: var(--accent); font-weight: 600; }

/* venue link strip (both faces) */
.flipcard-link {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; border-top: 1px solid var(--border-light); text-decoration: none;
  font-family: var(--sans); font-size: 11.5px; font-weight: 600; color: var(--accent);
}
.flipcard-link:hover { background: var(--accent-bg); }
.venue-arxiv .flipcard-link { color: var(--red); }
.venue-arxiv .flipcard-link:hover { background: var(--red-bg); }
.venue-ssrn .flipcard-link { color: var(--blue); }
.venue-ssrn .flipcard-link:hover { background: var(--blue-bg); }

@media (prefers-reduced-motion: reduce) {
  .flipcard-inner { transform: none !important; transition: none; }
  .flipcard-face { -webkit-backface-visibility: visible; backface-visibility: visible; transition: opacity 0.1s; }
  .flipcard-back { transform: none; opacity: 0; pointer-events: none; }
  .flipcard.is-flipped .flipcard-front { opacity: 0; pointer-events: none; }
  .flipcard.is-flipped .flipcard-back { opacity: 1; pointer-events: auto; }
}
```

- [ ] **Step 3: Verify braces + selectors, rebuild, test**

Run: `test $(grep -c '{' assets/site.css) -eq $(grep -c '}' assets/site.css) && echo balanced`
Expected: `balanced`.
Run: `for s in .flip-grid .flipcard-inner .flipcard-cover .flipcard-paneltitle .flipcard-link; do grep -q "$s" assets/site.css && echo "$s ok"; done`
Expected: all five `… ok`.
Run: `node build.js && node --test`
Expected: `index.html` regenerates; ALL tests PASS.

- [ ] **Step 4: Commit**

```bash
git add assets/site.css index.html
git commit -m "Replace .pubcard CSS with flip-card grid + 3D flip + reduced-motion" --no-verify
```

---

