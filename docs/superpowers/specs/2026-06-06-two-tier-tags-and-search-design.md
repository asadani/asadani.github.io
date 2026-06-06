# Two-Tier Tags + Client-Side Search — Design

**Date:** 2026-06-06
**Scope:** `index.html` (homepage article listing) only. No new pages, no backend, no build step.

## Problem

The homepage has a single-tier filter bar — 6 broad category pills (All / AI Engineering / Security / Infrastructure / Policy / Data / Interactive) driven by a `data-tags` attribute on each `.art-row`. Roughly 15 of 18 articles are `ai-engineering`, so the bar is lopsided and gives readers no way to slice *within* that dominant category. There is also no search.

The filter JS already splits `data-tags` on spaces (`.split(' ').includes(...)`), so the multi-value plumbing exists, but the vocabulary is single and flat.

## Goals

1. Add a **second tier of "flavor" tags** — cross-cutting technique/topic tags, orthogonal to the broad category — so readers can narrow within and across categories.
2. Add a **client-side search box** over the ~18 articles already in the DOM.
3. Keep it on the existing homepage with zero backend/build changes, fully themed via CSS variables (light + dark).

## Non-Goals (YAGNI)

- No dedicated `/tags/` index page.
- No multi-flavor selection (single active flavor at a time).
- No fuzzy search, search index file, or external search service.
- No clickable card-chips in v1 (the whole row is an `<a href>`; nested interactive controls deferred).
- No changes to per-article pages or `_template/article.html`.

---

## §1 — Flavor Vocabulary (data)

Categories stay as the existing 6 pills. **Flavors are cross-cutting** — a flavor may appear under several categories (that is the point of the second tier). Starting set of **11 flavors**:

| flavor | count | articles (slug) |
|---|---|---|
| `agents` | 3 | agentic-ocr-for-real, self-improving-ai-honestly, moral-surrender |
| `agentic-coding` | 3 | from-todo-to-toknow, ai-coding-agent-stack, ai-agent-stack-map |
| `models` | 3 | gemini-3-5-flash-agent-first, deepseek-v4-real-leap, ai-shrinkflation |
| `evals` | 3 | spec-lies-until-something-runs-it, automated-prompt-optimization, ai-shrinkflation |
| `craft` | 3 | from-todo-to-toknow, spec-lies-until-something-runs-it, moral-surrender |
| `prompting` | 2 | spec-lies-until-something-runs-it, automated-prompt-optimization |
| `cost-latency` | 2 | gemini-3-5-flash-agent-first, gemini-flex-inference |
| `supply-chain` | 2 | mcp-supply-chain-rce, litellm-supply-chain-attack |
| `provenance` | 2 | synthid-watermark-check, linux-ai-ownership |
| `rag` | 1 | contextual-retrieval-tradeoffs |
| `research` | 1 | self-improving-ai-honestly |

Category-only (no flavor): `data-product-manifesto` (Data), `amazon-s3-files` (Infrastructure).

### Full per-article assignment

| slug | category (`data-tags`) | flavors (`data-flavors`) |
|---|---|---|
| from-todo-to-toknow | ai-engineering | craft agentic-coding |
| spec-lies-until-something-runs-it | ai-engineering | prompting evals craft |
| synthid-watermark-check | ai-engineering | provenance |
| agentic-ocr-for-real | ai-engineering | agents |
| self-improving-ai-honestly | ai-engineering | agents research |
| gemini-3-5-flash-agent-first | ai-engineering | models cost-latency |
| moral-surrender | ai-engineering | agents craft |
| contextual-retrieval-tradeoffs | ai-engineering | rag |
| automated-prompt-optimization | ai-engineering | prompting evals |
| deepseek-v4-real-leap | ai-engineering | models |
| mcp-supply-chain-rce | security | supply-chain |
| data-product-manifesto | data | *(none)* |
| ai-coding-agent-stack | ai-engineering | agentic-coding |
| ai-agent-stack-map | interactive ai-engineering | agentic-coding |
| ai-shrinkflation | ai-engineering | models evals |
| gemini-flex-inference | ai-engineering | cost-latency |
| linux-ai-ownership | policy | provenance |
| amazon-s3-files | infrastructure | *(none)* |
| litellm-supply-chain-attack | security | supply-chain |

`data-tags` (category) is left exactly as it is today — no rename — to avoid breaking the existing filter. A new `data-flavors` attribute carries the space-separated flavor list.

---

## §2 — UI & Interaction

Layout, top of the `#articles` section:

```
🔍 [ search title, description, tags…                       ]

Category:  [All] [AI Engineering] [Security] [Infra] [Policy] [Data] [Interactive]
Flavor:    #agents #agentic-coding #models #evals #craft #prompting
           #cost-latency #supply-chain #provenance #rag #research

┌─ From TODO to TOKNOW ──────────────────────────┐
│ AI Engineering   #craft #agentic-coding         │
│ "The TODO was a promise to do the work…"        │
└─────────────────────────────────────────────────┘
```

- **Search box** (`#article-search`): full-width text input above both filter rows. Live `input` listener; substring match (case-insensitive) over title + description + flavors + category label. No debounce (≤20 rows).
- **Category row**: unchanged markup/behavior — single-select `.filter-pill`, reuses existing styles.
- **Flavor row** (`.flavor-bar`): second row of `.flavor-chip` buttons, **single-select toggle**. Clicking a chip applies it; clicking the active chip clears it back to "no flavor filter". A wrapping label `Flavor:` (or visually-styled lead) precedes them; the existing `Category:`/bar gets a matching lead for symmetry.
- **Card chips**: each `.art-row` renders its flavors as small **display-only** `.card-flavor` chips next to the existing `.art-badge` in `.art-top`. Not interactive in v1.
- **Styling**: all new classes use existing CSS variables only (`--surface`, `--border`, `--accent`, `--accent-bg`, `--text-muted`, `--mono`, etc.). No hardcoded hex values that differ between modes (the current `a.interest-tag:hover` rule hardcodes `#FFF4EE`/`#FF6719` — new code must NOT repeat that pattern). Flavor chips: mono font, ~11px, subtle bordered pill; `.active` flips to accent fill like `.filter-pill.active`.
- **Mobile**: both bars already `flex-wrap`; the flavor row wraps to multiple lines naturally.

---

## §3 — Filter Logic & Data Flow

State variables (extend the existing IIFE):

- `currentFilter` — category (existing, default `'all'`).
- `currentFlavor` — string or `null` (new, default `null`).
- `currentSearch` — lowercased query string (new, default `''`).

`filteredRows()` returns rows where **all three** match (AND):

```js
function matchesCategory(r) {
  return currentFilter === 'all'
    || (r.dataset.tags || '').split(' ').includes(currentFilter);
}
function matchesFlavor(r) {
  return !currentFlavor
    || (r.dataset.flavors || '').split(' ').includes(currentFlavor);
}
function matchesSearch(r) {
  if (!currentSearch) return true;
  const hay = (r.dataset.search || r.textContent).toLowerCase();
  return hay.includes(currentSearch);
}
```

Search haystack: simplest is `r.textContent.toLowerCase()` (covers title + quote + description). Optionally precompute a `data-search` attribute = title + desc + flavors + category for tighter matching; `textContent` is acceptable for v1.

- Any change to category, flavor, or search calls `renderPage(1)` — pagination resets to page 1 (existing pattern).
- `paginationInfo` "No articles found" path already handles the empty case.
- Flavor chips get their own `addEventListener` loop mirroring the category `pills` loop, with toggle-off behavior.
- Search input: `addEventListener('input', …)` setting `currentSearch = e.target.value.trim().toLowerCase()` then `renderPage(1)`.

---

## §4 — Maintenance / Docs

- Add an HTML comment block above the `.articles-list` in `index.html` documenting the flavor vocabulary and the `data-flavors` attribute, so future rows stay consistent.
- Add one line to `CLAUDE.md` noting the flavor vocabulary and that each homepage `.art-row` carries `data-tags` (category) + `data-flavors` (flavors) + visible `.card-flavor` chips.

---

## Acceptance Criteria

1. Homepage shows a search box, the existing category bar, and a new flavor bar.
2. Each article row displays its flavor chips next to its category badge.
3. Selecting a category, selecting a flavor, and typing in search each filter the list, and they combine (AND). Clearing all returns to the full list.
4. Clicking an active flavor chip clears the flavor filter.
5. Pagination resets to page 1 on any filter/search change and still hides/shows correctly.
6. Everything renders correctly in both light and dark mode with no hardcoded mode-specific colors in the new CSS.
7. No regression to the existing category-only filtering or pagination.
