# Publication Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three separate publication card styles (`.book-card`, `.pub-card`, `.store-card`) with one unified 40:60 split `.pubcard` — cover art (Books/Ko-fi) or a tinted venue panel (Papers) on the left, content + a text venue-wordmark chip on the right.

**Architecture:** Collapse the three render functions in `build.js` into one `renderPublicationCard(item, type)` driven by a `venueFor(type, item)` helper; replace the three card rule sets in `assets/site.css` with a `.pubcard` system + `.venue-badge` chips, deriving venue from bucket type (no `publications.json` change). Regenerate `index.html` via `node build.js`.

**Tech Stack:** Node 18 (built-in `node:test`, `fs`), static HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-06-21-publication-card-redesign-design.md`

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

## Task 1: Unify the publication renderers in `build.js`

Replace `renderBookCard` / `renderPubCard` / `renderStoreCard` with `venueFor` + `renderPublicationCard`, rewire `renderPublications`, and update the tests that referenced the old card classes.

**Files:**
- Modify: `build.js`
- Modify: `test/build.test.js`
- Modify: `test/publications-data.test.js`

**Interfaces:**
- Consumes: `esc`, `escAttr`, `formatDate` (existing).
- Produces:
  - `venueFor(type, item) -> { key, label }` where `type` ∈ `'books'|'papers'|'digital'`.
  - `renderPublicationCard(item, type) -> string` (emits `.pubcard` markup).
  - `renderPublications(pubs) -> string` (unchanged contract: 3 `.pub-bucket-label` buckets).
- Item shapes (from `data/publications.json`, unchanged): book `{title,subtitle,author,desc,cover,meta,url}`; paper `{badge,cat,title,authors:[{name,self?}],date,url}`; digital `{title,desc,image,url}`.

- [ ] **Step 1: Replace the three card tests in `test/build.test.js`**

Find and delete the existing `renderStoreCard` test (the block `test('renderStoreCard is a Ko-fi card with image and CTA', ...)`). In its place add:

```js
test('venueFor derives venue from type + paper badge', () => {
  assert.deepStrictEqual(b.venueFor('books', {}),   { key:'amazon', label:'Amazon' });
  assert.deepStrictEqual(b.venueFor('digital', {}), { key:'kofi',   label:'Ko-fi' });
  assert.deepStrictEqual(b.venueFor('papers', { badge:'arXiv' }), { key:'arxiv', label:'arXiv' });
  assert.deepStrictEqual(b.venueFor('papers', { badge:'SSRN' }),  { key:'ssrn',  label:'SSRN' });
});

test('renderPublicationCard: paper uses a venue panel + chip, no cover image', () => {
  const p = { badge:'arXiv', cat:'cs.CL', title:'On Things', date:'2026-05-13',
    authors:[{name:'Anuj Sadani',self:true},{name:'Deepak Kumar'}], url:'https://arxiv.org/abs/x' };
  const html = b.renderPublicationCard(p, 'papers');
  assert.match(html, /class="pubcard"/);
  assert.match(html, /class="pubcard-panel venue-arxiv"/);
  assert.match(html, /class="pubcard-panel-venue">arXiv</);
  assert.match(html, /class="venue-badge venue-arxiv">arXiv</);
  assert.ok(!/pubcard-cover/.test(html), 'paper has no cover image');
  assert.match(html, /class="pubcard-meta">&middot; May 13, 2026</);
  assert.match(html, /<span class="pub-self">Anuj Sadani<\/span>, Deepak Kumar/);
});

test('renderPublicationCard: book uses cover + Amazon chip + subtitle/author + desc', () => {
  const bk = { title:'The Clean Vibe Coder', subtitle:'A Code of Conduct', author:'Anuj Sadani',
    desc:'A field guide.', cover:'/assets/c.jpg', meta:'Kindle · 134 pages', url:'https://amazon/x' };
  const html = b.renderPublicationCard(bk, 'books');
  assert.match(html, /class="pubcard-cover" src="\/assets\/c\.jpg"/);
  assert.match(html, /class="venue-badge venue-amazon">Amazon</);
  assert.match(html, /class="pubcard-sub">A Code of Conduct &middot; <span class="pub-self">Anuj Sadani<\/span><\/div>/);
  assert.match(html, /class="pubcard-desc">A field guide.<\/div>/);
  assert.match(html, /class="pubcard-meta">&middot; Kindle · 134 pages</);
});

test('renderPublicationCard: digital uses image + Ko-fi chip + desc, no meta', () => {
  const d = { title:'Monk', desc:'A note.', image:'/m/m.png', url:'https://ko-fi.com/s/x' };
  const html = b.renderPublicationCard(d, 'digital');
  assert.match(html, /class="pubcard-cover" src="\/m\/m\.png"/);
  assert.match(html, /class="venue-badge venue-kofi">Ko-fi</);
  assert.match(html, /class="pubcard-desc">A note.<\/div>/);
  assert.ok(!/pubcard-meta/.test(html), 'digital has no meta line');
});
```

- [ ] **Step 2: Update `test/publications-data.test.js`'s render assertion**

Replace the existing test `test('publications render without throwing and emit all three buckets', ...)` with:

```js
test('publications render as unified pubcards across three buckets', () => {
  let html;
  assert.doesNotThrow(() => { html = b.renderPublications(pubs); });
  assert.match(html, /pub-bucket-label">Books</);
  assert.match(html, /pub-bucket-label">Papers</);
  assert.match(html, /pub-bucket-label">Digital</);
  const cards = (html.match(/class="pubcard"/g) || []).length;
  assert.strictEqual(cards, pubs.books.length + pubs.papers.length + pubs.digital.length);
  assert.match(html, /venue-badge venue-amazon/);
  assert.match(html, /venue-badge venue-arxiv/);
  assert.match(html, /venue-badge venue-kofi/);
  assert.match(html, /class="pubcard-panel venue-arxiv"/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `b.venueFor`/`b.renderPublicationCard` are not functions (and the deleted `renderStoreCard` references are gone).

- [ ] **Step 4: Rewrite the renderers in `build.js`**

In `build.js`, delete the three functions `renderBookCard`, `renderPubCard`, `renderStoreCard` and the old `renderPublications`. Insert this in their place:

```js
function venueFor(type, item){
  if(type === 'books')   return { key:'amazon', label:'Amazon' };
  if(type === 'digital') return { key:'kofi',   label:'Ko-fi' };
  return item.badge === 'SSRN' ? { key:'ssrn', label:'SSRN' } : { key:'arxiv', label:'arXiv' };
}

function renderPublicationCard(item, type){
  const v = venueFor(type, item);

  let media;
  if(type === 'papers'){
    const cat = item.cat ? `\n        <span class="pubcard-panel-cat">${esc(item.cat)}</span>` : '';
    media = `<div class="pubcard-panel venue-${v.key}">
        <span class="pubcard-panel-venue">${esc(v.label)}</span>${cat}
      </div>`;
  } else {
    const src = type === 'books' ? item.cover : item.image;
    media = `<img class="pubcard-cover" src="${escAttr(src)}" alt="${escAttr(item.title)} cover">`;
  }

  let sub = '';
  if(type === 'books'){
    sub = `\n        <div class="pubcard-sub">${esc(item.subtitle)} &middot; <span class="pub-self">${esc(item.author)}</span></div>`;
  } else if(type === 'papers'){
    const authors = item.authors.map(a => a.self
      ? `<span class="pub-self">${esc(a.name)}</span>` : esc(a.name)).join(', ');
    sub = `\n        <div class="pubcard-sub">${authors}</div>`;
  }

  const desc = (type === 'books' || type === 'digital')
    ? `\n        <div class="pubcard-desc">${esc(item.desc)}</div>` : '';

  let meta = '';
  if(type === 'books') meta = item.meta;
  else if(type === 'papers') meta = formatDate(item.date);
  const metaSpan = meta ? `\n          <span class="pubcard-meta">&middot; ${esc(meta)}</span>` : '';

  return `    <a class="pubcard" href="${escAttr(item.url)}" target="_blank" rel="noopener">
      <div class="pubcard-media">${media}</div>
      <div class="pubcard-body">
        <div class="pubcard-title">${esc(item.title)}</div>${sub}${desc}
        <div class="pubcard-foot">
          <span class="venue-badge venue-${v.key}">${esc(v.label)}</span>${metaSpan}
          <span class="pubcard-arrow">↗</span>
        </div>
      </div>
    </a>`;
}

function renderPublications(pubs){
  const bucket = (label, items, type) =>
    `    <div class="pub-bucket-label">${esc(label)}</div>\n` +
    items.map(it => renderPublicationCard(it, type)).join('\n');
  return [
    bucket('Books', pubs.books, 'books'),
    bucket('Papers', pubs.papers, 'papers'),
    bucket('Digital', pubs.digital, 'digital'),
  ].join('\n\n');
}
```

- [ ] **Step 5: Update the `module.exports` line in `build.js`**

Replace the existing `module.exports = { … }` (which lists `renderBookCard, renderPubCard, renderStoreCard`) with exactly this — the removed functions gone, `venueFor` + `renderPublicationCard` added:

```js
module.exports = { esc, escAttr, formatDate, TOPICS,
  renderArticleRow, renderArticlesList, venueFor, renderPublicationCard,
  renderPublications, renderPillars, injectBlocks, build };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all suites green (build.test, articles-data, publications-data, equivalence).

- [ ] **Step 7: Regenerate `index.html` and sanity-check markup**

Run: `node build.js`
Run: `grep -c 'class="pubcard"' index.html`
Expected: `6` (1 book + 2 papers + 3 digital).
Run: `grep -o 'venue-badge venue-[a-z]*' index.html | sort | uniq -c`
Expected: amazon ×1, arxiv ×2, kofi ×3.

- [ ] **Step 8: Commit**

```bash
git add build.js test/build.test.js test/publications-data.test.js index.html
git commit -m "Unify publication renderers into renderPublicationCard + venueFor"
```

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

## Final verification

- [ ] `node --test` → all PASS.
- [ ] `node build.js` idempotent: run twice, `git diff --quiet index.html` after the second.
- [ ] No old card classes leak into output: `grep -cE 'book-card|store-card|"pub-card"' index.html` → `0`.
- [ ] Article list untouched: the equivalence test still passes (already covered by `node --test`).
- [ ] Legacy article pages unchanged: `git diff --name-only main -- '*/index.html' | grep -v '^templates/'` → empty.

## Notes (follow-ups, not this plan)
- og:image / social-unfurl generation is the next cycle and may reuse a future image generator (could also generate real paper covers — Direction C from brainstorming).
- `CLAUDE.md` component list still documents `.book-card`/`.pub-card`/`.store-card`; update it to `.pubcard` when refreshing the docs alongside the `github-page-write` skill.
