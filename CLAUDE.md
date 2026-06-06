# Blog Design System — asadani.github.io

This repo contains standalone article pages. Each article lives in its own directory (`topic-name/index.html`) with fully inline CSS — no external stylesheets.

## One template, light + dark

There is a **single template**: `_template/article.html`. It renders the *same design* in both light and dark mode — readers flip between them with a toggle button in the nav. There is no longer a separate theme per topic (the old warm-light / dark-cyberpunk split is retired).

When creating a new article, copy `_template/article.html` to `<topic-slug>/index.html` and replace the `{{PLACEHOLDERS}}`.

**Theming rules:**
- Colors come entirely from CSS variables. Light is the `:root` default; dark is the `[data-theme="dark"]` override. **Never hardcode a color that must differ between modes** — add/use a variable instead.
- Theme is chosen before first paint by an inline `<head>` script: saved `localStorage.theme` wins, else the reader's OS `prefers-color-scheme`. A nav `.theme-toggle` button flips `data-theme` on `<html>` and persists the choice. **Keep both scripts and the toggle button intact** when filling the template.
- Security / vulnerability write-ups use this same template — there is no special "incident" theme. Lean on `.callout`, `.card-red`, and `.data-table` for adversarial content.

---

## Fonts (Google Fonts)
```
Newsreader (serif) — headings, h1/h2/h3
Inter (sans-serif) — body, nav, labels
JetBrains Mono — meta, code, badges
```

## Layout
max-width 760px, centered, padding 0 24px 80px.

## CSS variables

**Light — `:root` (default):**
```css
--bg: #F5F1EB          /* warm off-white page bg */
--bg-alt: #EDEAE3      /* slightly darker, used in table headers */
--surface: #FFFFFF     /* card / nav bg */
--surface-tint: #FAF8F5
--border: #DDD9D0
--border-light: #EAE7E0
--text: #1A1714        /* headings */
--text-body: #3D3A35   /* body copy */
--text-muted: #6B6760
--text-subtle: #9B9892
--accent: #C85C2D      /* terracotta/rust — primary accent */
--accent-light: #E8895D
--accent-bg: #FDF1EB
--accent-border: #F0C4A8
--green: #2A7A4B  --green-bg: #EAF5EF  --green-border: #A8D9BC
--blue: #2563A8   --blue-bg: #EAF1FA   --blue-border: #A8C5E8
--red: #B83535    --red-bg: #FAEBEB    --red-border: #E8AAAA
--code-bg: #1A1714     /* code blocks stay dark in BOTH modes */
--shadow: rgba(200,92,45,0.08)
--serif: 'Newsreader', Georgia, serif
--sans: 'Inter', system-ui, sans-serif
--mono: 'JetBrains Mono', 'Courier New', monospace
color-scheme: light
```

**Dark — `[data-theme="dark"]` override:** warm dark, not pure black; the terracotta accent brightens so it reads on dark. Only colors change — fonts, layout, and component classes are identical.
```css
--bg: #14110D
--bg-alt: #1E1A14
--surface: #1A1611
--surface-tint: #211C16
--border: #332C24
--border-light: #2A241D
--text: #F2EEE7
--text-body: #D8D2C8
--text-muted: #A39C90
--text-subtle: #7A7468
--accent: #E8895D
--accent-light: #F0A079
--accent-bg: #2C1E14
--accent-border: #5A3826
--green: #5FD699  --green-bg: #14241B  --green-border: #2E5640
--blue: #6FB0F0   --blue-bg: #142233   --blue-border: #2C4A6E
--red: #F08585    --red-bg: #2E1717    --red-border: #663434
--code-bg: #0E0B08
--shadow: rgba(0,0,0,0.45)
color-scheme: dark
```

## Key components
- `<nav>` — sticky, 52px, surface with border. `.nav-brand` left; `.nav-right` holds `.nav-tag` badge + the `.theme-toggle` button (shows `☾` in light → click for dark, `☀` in dark → click for light).
- `.hero` — 64px top padding. `.hero-eyebrow` (uppercase accent label) → `<h1>` (serif, clamp 34–52px) → `.hero-deck` (18px muted) → `.hero-meta` (mono, small).
- `.banner` — accent-bg card with 3px accent left border. `.banner-badge` pill inside.
- `.toc` — optional jump-to card (`.toc-label` + `.toc-list` ordered list of `.toc-num` + `<a>` links pointing at section ids). 2-up grid, collapses to 1 column on mobile. Use only for longer posts.
- `.section` — 56px top margin, `scroll-margin-top: 72px` for anchored jumps. Give each a unique kebab-case `id`. `.section-label` (uppercase 11px accent) above `<h2>`. **Self-linking heading:** wrap the `<h2>` text in `<a class="anchor" href="#id">` — a `#` appears on hover and clicking sets the URL hash.
- `.plain-english` — surface card, 3px accent top border. `.pe-label` heading, `.pe-list` with numbered `.pe-num` circles; optional `.pe-intro` lead paragraph.
- `.cards-grid` — auto-balancing grid (no `auto-fit`): default 3-up (3 cards = 1×3, 6 = 3×2); exactly 2 or 4 cards drop to 2 columns (4 = 2×2) via `:has()` quantity queries. Force with `.cols-2` / `.cols-3`. `.card` variants: `.card-red`, `.card-green`, `.card-blue`; `.card-icon-badge` for the colored label.
- `.callout` — accent-bg, 3px left border. `.callout-lbl` + `<p>`.
- `.code-block` — `var(--code-bg)` (dark in both modes), `.cb-label` header, `<pre>` with token classes: `.tok-key`, `.tok-val`, `.tok-cmt`, `.tok-str`, `.tok-acc`.
- `ul.dl` — bordered list with `→` accent bullets.
- `.data-table` — scrollable wrapper with striped hover. For controlled column widths use `<table class="fixed">` + a `<colgroup>` of `<col style="width:..%">` (fixed layout is what makes colgroup widths actually hold — auto layout ignores them). First `<td>` per row auto-bolds as the row label. Alignment helpers on `<th>` **and** its `<td>`s: `.center`, `.num` (right-aligned, tabular figures, no-wrap), `.nowrap`. Value classes: `.td-yes` (green), `.td-no` (red), `.td-mono` (mono accent).
- `<footer>` — surface, border-top. Left: plain text. Right: links.
- **Homepage article tagging (`index.html`):** each `.art-row` has `data-tags` (broad category → Topic pills) **and** `data-flavors` (space-separated cross-cutting flavors → Flavor chips + visible `.card-flavors` chips). The article list also has a client-side search box (`#article-search`) that substring-matches row text; Topic + Flavor + search combine with AND. Flavor vocabulary: `agents, agentic-coding, models, evals, craft, prompting, cost-latency, supply-chain, provenance, rag, research`. Adding a flavor means updating the `.flavor-bar` buttons, the in-file comment above `.articles-list`, and the row's attributes/chips.
