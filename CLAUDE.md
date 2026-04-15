# Blog Design System — asadani.github.io

This repo contains standalone article pages. Each article lives in its own directory (`topic-name/index.html`) with fully inline CSS — no external stylesheets.

## Choosing a theme

| Theme | Use when | Example article |
|---|---|---|
| **Warm-light** | General analysis, policy, how-to, explainers | linux-ai-ownership, amazon-s3-files, gemini-flex-inference |
| **Dark-cyberpunk** | Security incidents, vulnerability write-ups, adversarial topics | litellm-supply-chain-attack |

When creating a new article, copy the appropriate template from `_template/` and replace `{{PLACEHOLDERS}}`.

---

## Warm-Light Theme

**Fonts (Google Fonts):**
```
Newsreader (serif) — headings, h1/h2/h3
Inter (sans-serif) — body, nav, labels
JetBrains Mono — meta, code, badges
```

**CSS variables:**
```css
--bg: #F5F1EB          /* warm off-white page bg */
--bg-alt: #EDEAE3      /* slightly darker, used in table headers */
--surface: #FFFFFF     /* card / nav / code block bg */
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
--serif: 'Newsreader', Georgia, serif
--sans: 'Inter', system-ui, sans-serif
--mono: 'JetBrains Mono', 'Courier New', monospace
```

**Layout:** max-width 760px, centered, padding 0 24px 80px.

**Key components:**
- `<nav>` — sticky, 52px, white surface with border. `.nav-brand` left, `.nav-right` with `.nav-tag` badge right.
- `.hero` — 64px top padding. `.hero-eyebrow` (uppercase accent label) → `<h1>` (serif, clamp 34–52px) → `.hero-deck` (18px muted) → `.hero-meta` (mono, small).
- `.banner` — accent-bg card with 3px accent left border. `.banner-badge` pill inside.
- `.section` — 56px top margin. `.section-label` (uppercase 11px accent) above `<h2>` (serif 28px).
- `.plain-english` — white surface card, 3px accent top border. `.pe-list` with numbered `.pe-num` circles.
- `.cards-grid` — auto-fit grid. `.card` with variants: `.card-red`, `.card-green`, `.card-blue`. `.card-icon-badge` for the colored label.
- `.callout` — accent-bg, 3px left border. `.callout-lbl` + `<p>`.
- `.code-block` — dark bg (`var(--text)`), `.cb-label` header, `<pre>` with token classes: `.tok-key`, `.tok-val`, `.tok-cmt`, `.tok-str`, `.tok-acc`.
- `ul.dl` — bordered list with `→` accent bullets.
- `.data-table` — scrollable table wrapper with striped hover.
- `.chain-wrap` / `.chain-step` — vertical responsibility chain with numbered circles.
- `<footer>` — white surface, border-top. Left: plain text. Right: links.

---

## Dark-Cyberpunk Theme

**Fonts (Google Fonts):**
```
Syne (display) — headings
DM Sans (sans) — body
Syne Mono (mono) — labels, code, header
```

**CSS variables:**
```css
--bg: #0a0a0a          /* near-black */
--surface: #111111
--surface2: #181818
--border: #222222
--text: #e8e8e8
--text-muted: #666
--text-dim: #999
--accent: #ff3c3c      /* bright red */
--accent2: #ff7c3c
--accent-glow: rgba(255,60,60,0.15)
--green: #3cffa0       /* neon green */
--yellow: #ffd93c      /* bright yellow */
--blue: #3cb8ff        /* cyan */
--mono: 'Syne Mono', monospace
--sans: 'DM Sans', sans-serif
--display: 'Syne', sans-serif
```

**Special effects:**
- `body::before` — fixed scanline overlay using `repeating-linear-gradient`
- `.section` — `animation: fadeUp 0.6s ease both` on load
- `.tag-critical` — `animation: pulse-tag 2s ease-in-out infinite`
- Custom `::-webkit-scrollbar` styled to accent on hover

**Layout:** max-width 860px, padding 0 40px.

**Key components:**
- `.header` — sticky, `backdrop-filter: blur(12px)`, semi-transparent bg. `.header-logo` (mono, accent color) left, `.header-meta` (mono, muted) right.
- `.hero` — with gradient line `::before`. `.tag-row` → tags (`.tag-critical`, `.tag-date`, `.tag-topic`). `.hero-title` with `.accent` and `.dim` spans. `.hero-subtitle` italic. `.hero-stats` grid of `.stat` with `.stat-value` (mono accent) + `.stat-label`.
- `.section` — border-top separator. `.section-number` (e.g. `01 / What Happened`) + `.section-title`.
- `.code-block` — dark surface, 3px accent left border. `.code-block-label` + `<pre><code>`. `.inline-code` for inline spans (blue colored).
- `.callout` — 4 variants: `.callout-warn` (yellow), `.callout-danger` (red), `.callout-info` (blue), `.callout-safe` (green). Grid layout with `.callout-icon` + `.callout-body`.
- `.stages` — vertical attack stages. `.stage` with `.stage-num` (large mono, border-colored, turns accent on hover) + content.
- `.timeline` — left accent gradient line, `.timeline-item` with dot `::before`. `.timeline-time` (mono accent) + `.timeline-event`.
- `.pull-quote` — 3px accent left border, display font, italic.
- `.badge` — variants: `.badge-clean` (green), `.badge-danger` (red), `.badge-critical` (solid red).
- `.checklist` — `□` prefix items in surface cards.
- `.prevention-grid` — gap-separated grid of `.prevention-card`.
- `<footer class="footer">` — `.footer-note` (mono, muted) + `.footer-links` (mono, uppercase).
