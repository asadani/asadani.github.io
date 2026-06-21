# Site Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-maintained homepage + per-article inline CSS with a zero-dependency Node build script driven by JSON data, rework the landing into a publication-framed Direction-A hero, and render Publications as Books/Papers/Digital buckets.

**Architecture:** A plain Node 18 `build.js` (no npm install) reads `data/articles.json` + `data/publications.json` and a hand-authored `templates/index.template.html`, renders three injected blocks (hero pillars, publications, article list), computes pillar counts from the data, and writes static `index.html`. The design system moves to one shared `/assets/site.css` linked by the homepage and all new articles. The 25 existing article *pages* are frozen; only their homepage list *entries* migrate into the data file.

**Tech Stack:** Node 18 (built-in `node:test`, `fs`, no dependencies), static HTML/CSS, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-06-21-site-uplift-design.md`

## Global Constraints

- **Runtime:** Node 18 only. `build.js` and tests use built-in modules (`fs`, `path`, `node:test`) — **zero npm dependencies**, no `package.json` required. Files are CommonJS (`require`/`module.exports`).
- **Commit identity:** author MUST be `asadani <anuj.k.sadani@gmail.com>` (verify `git config user.email` == `anuj.k.sadani@gmail.com`). **No `Co-Authored-By` trailer.**
- **Push:** `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_github_personal -o IdentitiesOnly=yes" git push` (default agent uses the wrong identity). Push only at the end / when asked.
- **Legacy pages frozen:** do NOT modify any existing `*/index.html` article file. Verify with `git diff --name-only` showing no article-dir edits.
- **Colors via CSS variables only** — never hardcode a color that differs between light/dark. Light = `:root`, dark = `[data-theme="dark"]`.
- **Arrow glyphs:** use the literal `↗` (up-right) for external links and `→` / `&rarr;` for internal "Read" links, matching existing markup. Do NOT substitute `&uarr;` (↑).
- **Escaping:** text content uses `esc()` (escapes `& < >` only); attribute values use `escAttr()` (also escapes `"`). This keeps literal `"` inside `.art-quote` text matching the originals.

---

## Task 1: `build.js` rendering library + unit tests

Pure render functions and helpers, fully unit-tested. No file I/O wiring yet (that is Task 5).

**Files:**
- Create: `build.js`
- Create: `test/build.test.js`

**Interfaces:**
- Produces (consumed by Task 5 `build()` and by tests):
  - `esc(s) -> string`, `escAttr(s) -> string`
  - `formatDate(iso) -> string` (`"2026-06-18"` → `"June 18, 2026"`)
  - `renderArticleRow(a) -> string`, `renderArticlesList(arts) -> string` (sorts by `date` desc)
  - `renderBookCard(b) -> string`, `renderPubCard(p) -> string`, `renderStoreCard(d) -> string`
  - `renderPublications(pubs) -> string`, `renderPillars(counts) -> string`
  - `injectBlocks(template, blocksObj) -> string`
  - `TOPICS` map (`topic slug -> {row, badge, label}`)
- Article object shape: `{ slug, title, date, topic, flavors[], quote, desc, shareUrl }`
- Pub objects: book `{title, subtitle, author, desc, cover, meta, url}`; paper `{badge, cat, id, title, authors:[{name,self?}], date, url}`; digital `{title, desc, image, url}`
- `counts` shape: `{ writing, papers, booksDigital }`

- [ ] **Step 1: Write the failing tests**

Create `test/build.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const b = require('../build.js');

test('esc escapes & < > but NOT double-quote', () => {
  assert.strictEqual(b.esc('R&D <x> "q"'), 'R&amp;D &lt;x&gt; "q"');
});

test('escAttr also escapes double-quote', () => {
  assert.strictEqual(b.escAttr('a "b" & c'), 'a &quot;b&quot; &amp; c');
});

test('formatDate renders long US date', () => {
  assert.strictEqual(b.formatDate('2026-06-18'), 'June 18, 2026');
  assert.strictEqual(b.formatDate('2026-04-23'), 'April 23, 2026');
});

test('renderArticlesList sorts by date descending', () => {
  const arts = [
    { slug:'a', title:'A', date:'2026-01-01', topic:'ai-engineering', flavors:[], quote:'q', desc:'d', shareUrl:'https://x/a/' },
    { slug:'b', title:'B', date:'2026-03-01', topic:'ai-engineering', flavors:[], quote:'q', desc:'d', shareUrl:'https://x/b/' },
  ];
  const html = b.renderArticlesList(arts);
  assert.ok(html.indexOf('href="/b/"') < html.indexOf('href="/a/"'), 'newer (b) must come first');
});

test('renderArticleRow carries data attributes and topic class', () => {
  const a = { slug:'demo', title:'T & U', date:'2026-06-18', topic:'ai-engineering',
    flavors:['models','research'], quote:'"hi"', desc:'D', shareUrl:'https://x/demo/' };
  const html = b.renderArticleRow(a);
  assert.match(html, /class="art-row art-ai"/);
  assert.match(html, /data-tags="ai-engineering"/);
  assert.match(html, /data-flavors="models research"/);
  assert.match(html, /<span class="art-title">T &amp; U<\/span>/);
  assert.match(html, /class="art-quote">"hi"</); // literal quotes preserved
});

test('renderStoreCard is a Ko-fi card with image and CTA', () => {
  const d = { title:'Monk', desc:'A note', image:'/m/m.png', url:'https://ko-fi.com/s/x' };
  const html = b.renderStoreCard(d);
  assert.match(html, /class="store-card"/);
  assert.match(html, /class="store-badge">Ko-fi</);
  assert.match(html, /src="\/m\/m\.png"/);
  assert.match(html, /View on Ko-fi ↗/);
  assert.match(html, /href="https:\/\/ko-fi\.com\/s\/x"/);
});

test('renderPillars emits three cards with counts', () => {
  const html = b.renderPillars({ writing:25, papers:3, booksDigital:4 });
  assert.match(html, /class="pillar-count">25</);
  assert.match(html, /class="pillar-count">3</);
  assert.match(html, /class="pillar-count">4</);
  assert.match(html, /Books &amp; Digital/);
});

test('injectBlocks replaces only inside the named marker pair', () => {
  const tpl = 'A<!-- BUILD:x -->OLD<!-- /BUILD:x -->B';
  const out = b.injectBlocks(tpl, { x: 'NEW' });
  assert.strictEqual(out, 'A<!-- BUILD:x -->\nNEW\n<!-- /BUILD:x -->B');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `Cannot find module '../build.js'`.

- [ ] **Step 3: Write `build.js` helpers + render functions**

Create `build.js`:

```js
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return esc(s).replace(/"/g,'&quot;'); }
function formatDate(iso){ const [y,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}, ${y}`; }

// topic slug -> row class / badge class / human label.
// Fill ALL topics from the existing index.html in Task 2 (Step 1 grep).
const TOPICS = {
  'ai-engineering': { row:'art-ai', badge:'badge-ai', label:'AI Engineering' },
  // security / infrastructure / policy / data / interactive — added in Task 2
};

const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

function renderArticleRow(a){
  const t = TOPICS[a.topic];
  if(!t) throw new Error(`Unknown topic: ${a.topic}`);
  const flavorChips = a.flavors.map(f => `<span class="card-flavor">${esc(f)}</span>`).join('');
  return `      <a class="art-row ${t.row}" href="/${a.slug}/" data-tags="${escAttr(a.topic)}" data-flavors="${escAttr(a.flavors.join(' '))}">
        <div class="art-strip"></div>
        <div class="art-body">
          <div class="art-top"><span class="art-badge ${t.badge}">${esc(t.label)}</span><span class="art-title">${esc(a.title)}</span><span class="card-flavors">${flavorChips}</span></div>
          <div class="art-quote">${esc(a.quote)}</div>
          <div class="art-desc">${esc(a.desc)}</div>
        </div>
        <div class="art-meta">
          <span class="art-date">${formatDate(a.date)}</span>
          <div class="art-actions">
            <button class="share-btn" aria-label="Share" data-url="${escAttr(a.shareUrl)}" data-title="${escAttr(a.title)}">
              ${SHARE_SVG}
            </button>
            <span class="art-link">Read &rarr;</span>
          </div>
        </div></a>`;
}

function renderArticlesList(arts){
  return arts.slice().sort((x,y)=> y.date.localeCompare(x.date)).map(renderArticleRow).join('\n\n');
}

function renderBookCard(b){
  return `    <a class="book-card" href="${escAttr(b.url)}" target="_blank" rel="noopener">
      <div class="book-strip"></div>
      <img class="book-cover" src="${escAttr(b.cover)}" alt="${escAttr(b.title)} book cover">
      <div class="book-body">
        <div class="book-title">${esc(b.title)}</div>
        <div class="book-sub">${esc(b.subtitle)} &middot; <span class="pub-self" style="color:var(--accent);font-weight:600">${esc(b.author)}</span></div>
        <div class="book-desc">${esc(b.desc)}</div>
        <div class="book-footer">
          <span class="book-meta">${esc(b.meta)}</span>
          <span class="book-cta">Buy on Amazon ↗</span>
        </div>
      </div>
    </a>`;
}

function renderPubCard(p){
  const cat = p.cat ? `\n          <span class="pub-cat">${esc(p.cat)}</span>` : '';
  const authors = p.authors.map(a => a.self
    ? `<span class="pub-self">${esc(a.name)}</span>` : esc(a.name)).join(', ');
  return `    <a class="pub-card" href="${escAttr(p.url)}" target="_blank" rel="noopener">
      <div class="pub-strip"></div>
      <div class="pub-body">
        <div class="pub-top">
          <span class="pub-badge">${esc(p.badge)}</span>${cat}
          <span class="pub-id">${esc(p.id)}</span>
        </div>
        <div class="pub-title">${esc(p.title)}</div>
        <div class="pub-authors">${authors}</div>
        <div class="pub-footer">
          <span class="pub-date">${formatDate(p.date)}</span>
          <span class="pub-link">Read on ${esc(p.badge)} ↗</span>
        </div>
      </div>
    </a>`;
}

function renderStoreCard(d){
  return `    <a class="store-card" href="${escAttr(d.url)}" target="_blank" rel="noopener">
      <div class="store-strip"></div>
      <img class="store-cover" src="${escAttr(d.image)}" alt="${escAttr(d.title)} cover">
      <div class="store-body">
        <span class="store-badge">Ko-fi</span>
        <div class="store-title">${esc(d.title)}</div>
        <div class="store-desc">${esc(d.desc)}</div>
        <div class="store-footer">
          <span class="store-cta">View on Ko-fi ↗</span>
        </div>
      </div>
    </a>`;
}

function renderPublications(pubs){
  const bucket = (label, items, fn) =>
    `    <div class="pub-bucket-label">${esc(label)}</div>\n` + items.map(fn).join('\n');
  return [
    bucket('Books', pubs.books, renderBookCard),
    bucket('Papers', pubs.papers, renderPubCard),
    bucket('Digital', pubs.digital, renderStoreCard),
  ].join('\n\n');
}

function renderPillars(c){
  const cards = [
    { label:'Writing', count:c.writing, meta:'essays & field notes', href:'#articles' },
    { label:'Papers', count:c.papers, meta:'arXiv / SSRN', href:'#research' },
    { label:'Books & Digital', count:c.booksDigital, meta:'books & Ko-fi', href:'#research' },
  ];
  return `<div class="pillars">\n` + cards.map(p =>
`      <a class="pillar-card" href="${p.href}">
        <span class="pillar-label">${esc(p.label)}</span>
        <span class="pillar-count">${p.count}</span>
        <span class="pillar-meta">${esc(p.meta)}</span>
        <span class="pillar-link">Browse &rarr;</span>
      </a>`).join('\n') + `\n    </div>`;
}

function injectBlocks(template, blocks){
  let out = template;
  for(const [key, html] of Object.entries(blocks)){
    const re = new RegExp(`<!-- BUILD:${key} -->[\\s\\S]*?<!-- /BUILD:${key} -->`);
    if(!re.test(out)) throw new Error(`Marker not found: BUILD:${key}`);
    out = out.replace(re, `<!-- BUILD:${key} -->\n${html}\n<!-- /BUILD:${key} -->`);
  }
  return out;
}

module.exports = { esc, escAttr, formatDate, TOPICS,
  renderArticleRow, renderArticlesList, renderBookCard, renderPubCard,
  renderStoreCard, renderPublications, renderPillars, injectBlocks };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add build.js test/build.test.js
git commit -m "Add build.js rendering library + unit tests"
```

---

## Task 2: `data/articles.json` — migrate the 25 existing rows

Extract the current homepage article rows into structured data and complete the `TOPICS` map. The 25 article HTML files are NOT touched.

**Files:**
- Create: `data/articles.json`
- Modify: `build.js` (complete the `TOPICS` map)
- Create: `test/articles-data.test.js`

**Interfaces:**
- Consumes: `renderArticleRow`, `renderArticlesList`, `TOPICS` from Task 1.
- Produces: `data/articles.json` (array of article objects) used by Task 5 `build()`.

- [ ] **Step 1: Extract the topic→class→label map from the live homepage**

Run: `grep -oE 'class="art-row art-[a-z]+"' index.html | sort -u`
Run: `grep -oE 'art-badge badge-[a-z]+">[^<]+' index.html | sort -u`

Use the results to fill **every** topic in `build.js`'s `TOPICS` map. The topic slug equals the `data-tags` value on each row (`grep -oE 'data-tags="[^"]+"' index.html | sort -u`). Example known entry: `ai-engineering → {row:'art-ai', badge:'badge-ai', label:'AI Engineering'}`. Add `security`, `infrastructure`, `policy`, `data`, `interactive` (and any others the greps reveal) with their exact discovered class suffixes and labels.

- [ ] **Step 2: Write the failing data test**

Create `test/articles-data.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const b = require('../build.js');

const arts = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/articles.json'),'utf8'));

test('all 25 existing articles are present', () => {
  assert.strictEqual(arts.length, 25);
});

test('every article has required fields and a known topic', () => {
  for(const a of arts){
    for(const k of ['slug','title','date','topic','flavors','quote','desc','shareUrl']){
      assert.ok(a[k] !== undefined, `missing ${k} on ${a.slug}`);
    }
    assert.ok(Array.isArray(a.flavors));
    assert.ok(b.TOPICS[a.topic], `unknown topic ${a.topic} on ${a.slug}`);
    assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('every article renders without throwing', () => {
  assert.doesNotThrow(() => b.renderArticlesList(arts));
});

test('slugs are unique', () => {
  assert.strictEqual(new Set(arts.map(a=>a.slug)).size, arts.length);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/articles-data.test.js`
Expected: FAIL — `data/articles.json` does not exist.

- [ ] **Step 4: Create `data/articles.json` by migrating each current row**

For each `.art-row` in `index.html`, create one object. Map the existing markup to fields:
- `slug` ← from `href="/SLUG/"`
- `topic` ← `data-tags`
- `flavors` ← `data-flavors` split on spaces
- `title` ← `.art-title` text (un-escape `&amp;`→`&` etc. back to raw)
- `quote` ← `.art-quote` text (include the literal `"` characters as they appear)
- `desc` ← `.art-desc` text (raw)
- `date` ← `.art-date` converted to ISO (`"June 18, 2026"` → `"2026-06-18"`)
- `shareUrl` ← the `data-url` on `.share-btn` (rows without a share button: use `https://asadani.github.io/SLUG/`)

One fully-worked example (the newest row):

```json
[
  {
    "slug": "the-monk-who-oversold-the-ai",
    "title": "The Monk Who Oversold the AI",
    "date": "2026-06-18",
    "topic": "ai-engineering",
    "flavors": ["models", "research"],
    "quote": "\"You can rent capability. You cannot rent a moat.\"",
    "desc": "A product leader replaced the company's R&D with borrowed foundation-model capability, scaled brilliantly for two years, won the CEO's trust, and then dissolved the only moat the product had. Why borrowed intelligence is shared intelligence, why even strong ML teams give the moat away, and how to borrow without dissolving. Includes a downloadable designed PDF.",
    "shareUrl": "https://asadani.github.io/the-monk-who-oversold-the-ai/"
  }
]
```

Repeat for all 25 rows, preserving their content exactly (store raw text; `esc()` re-applies entities at render time).

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all Task 1 + Task 2 tests green (25 articles, known topics, unique slugs, renders cleanly).

- [ ] **Step 6: Commit**

```bash
git add data/articles.json build.js test/articles-data.test.js
git commit -m "Add data/articles.json (migrate 25 rows) + complete TOPICS map"
```

---

## Task 3: `data/publications.json` — Books / Papers / Digital

Structured data for the Publications section and the Papers + Books&Digital pillar counts. Folds in SSRN and the three Ko-fi products.

> **INPUTS REQUIRED (collect from Anuj before writing the file — do NOT invent):**
> - SSRN paper **title** and **date** (page at `abstract_id=6071412` is JS-rendered, not scrapable).
> - **One-line description** for each of the 3 Ko-fi products.
> If a value is not yet available, STOP and ask Anuj rather than guessing.

**Files:**
- Create: `data/publications.json`
- Create: `test/publications-data.test.js`

**Interfaces:**
- Consumes: `renderPublications`, `renderBookCard`, `renderPubCard`, `renderStoreCard` from Task 1.
- Produces: `data/publications.json` used by Task 5 `build()` (counts: papers, books, digital).

- [ ] **Step 1: Write the failing data test**

Create `test/publications-data.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const b = require('../build.js');

const pubs = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/publications.json'),'utf8'));

test('bucket counts: 1 book, 3 papers, 3 digital', () => {
  assert.strictEqual(pubs.books.length, 1);
  assert.strictEqual(pubs.papers.length, 3);
  assert.strictEqual(pubs.digital.length, 3);
});

test('SSRN paper is present in papers', () => {
  assert.ok(pubs.papers.some(p => /ssrn/i.test(p.url) && /6071412/.test(p.url)));
});

test('all three Ko-fi products have image + non-empty description', () => {
  const urls = pubs.digital.map(d=>d.url);
  assert.ok(urls.includes('https://ko-fi.com/s/02e8517c71'));
  assert.ok(urls.includes('https://ko-fi.com/s/b7efb1eb2e'));
  assert.ok(urls.includes('https://ko-fi.com/s/3be014f2e6'));
  for(const d of pubs.digital){
    assert.ok(d.image && d.image.endsWith('.png'), `missing image on ${d.url}`);
    assert.ok(d.desc && d.desc.trim().length > 0, `empty desc on ${d.url}`);
  }
});

test('publications render without throwing', () => {
  assert.doesNotThrow(() => b.renderPublications(pubs));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/publications-data.test.js`
Expected: FAIL — `data/publications.json` does not exist.

- [ ] **Step 3: Create `data/publications.json`**

Substitute the collected SSRN title/date and the three Ko-fi descriptions (the `«…»` slots):

```json
{
  "books": [
    {
      "title": "The Clean Vibe Coder",
      "subtitle": "A Code of Conduct for Programmers in the Age of AI Agents",
      "author": "Anuj Sadani",
      "desc": "A field guide for the working engineer when a stochastic, non-deterministic teammate writes a substantial fraction of the code — and the human at the keyboard still owns every commit that ships under their name. An updated professional ethic for the agent era: the orchestrator role, verification duty, provenance as part of the artifact, and concrete practices you can apply on Monday. A chapter-for-chapter response, fifteen years on, to The Clean Coder.",
      "cover": "/assets/clean-vibe-coder-cover.jpg",
      "meta": "Kindle · 134 pages · May 26, 2026",
      "url": "https://www.amazon.in/dp/B0H2ZBMFR4"
    }
  ],
  "papers": [
    {
      "badge": "arXiv", "cat": "cs.CL", "id": "arXiv:2605.13538",
      "title": "Locale-Conditioned Few-Shot Prompting Mitigates Demonstration Regurgitation in On-Device PII Substitution with Small Language Models",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-05-13",
      "url": "https://arxiv.org/abs/2605.13538"
    },
    {
      "badge": "arXiv", "cat": "cs.AI", "id": "arXiv:2604.21816",
      "title": "Tool Attention Is All You Need: Dynamic Tool Gating and Lazy Schema Loading for Eliminating the MCP/Tools Tax in Scalable Agentic Workflows",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-04-23",
      "url": "https://arxiv.org/abs/2604.21816"
    },
    {
      "badge": "SSRN", "cat": "", "id": "SSRN:6071412",
      "title": "«SSRN_TITLE»",
      "authors": [{ "name": "Anuj Sadani", "self": true }],
      "date": "«SSRN_DATE_ISO»",
      "url": "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6071412"
    }
  ],
  "digital": [
    {
      "title": "The Monk Who Oversold the AI",
      "desc": "«KOFI_DESC_MONK»",
      "image": "/the-monk-who-oversold-the-ai/the-monk-who-oversold-the-ai.png",
      "url": "https://ko-fi.com/s/02e8517c71"
    },
    {
      "title": "Three Leaders, One Market: A Field Report on Why Good AI Strategies Still Fail",
      "desc": "«KOFI_DESC_THREE»",
      "image": "/three-leaders-one-market/three-leader.png",
      "url": "https://ko-fi.com/s/b7efb1eb2e"
    },
    {
      "title": "The Barbell & The Vanishing Middle: IDP",
      "desc": "«KOFI_DESC_IDP»",
      "image": "/idp-barbell/the-idp-barbell.png",
      "url": "https://ko-fi.com/s/3be014f2e6"
    }
  ]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — bucket counts 1/3/3, SSRN present, all Ko-fi cards have image + description.

- [ ] **Step 5: Commit**

```bash
git add data/publications.json test/publications-data.test.js
git commit -m "Add data/publications.json (Books/Papers/Digital, SSRN + Ko-fi)"
```

---

## Task 4: `/assets/site.css` — extract shared design system + new components

Move the homepage's inline CSS into one shared stylesheet and add the new `.store-card`, `.pillars`/`.pillar-card`, and `.pub-bucket-label` rules.

**Files:**
- Create: `assets/site.css`

- [ ] **Step 1: Extract the existing inline CSS**

In `index.html`, locate the single `<style> … </style>` block in `<head>` (it begins after the fonts `<link>` and contains the `:root` variables through the footer rules — roughly lines 14–571; confirm the exact bounds with `grep -n '</\?style>' index.html`). Copy its **entire inner contents** verbatim into a new file `assets/site.css`. Do not edit the rules during the move.

- [ ] **Step 2: Append the new component CSS**

Append to `assets/site.css` (uses only existing CSS variables, so light/dark work automatically):

```css
/* ─── PUBLICATIONS: bucket labels ─────────────────────── */
.pub-bucket-label {
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted);
  margin: 20px 0 10px;
}
.pub-bucket-label:first-of-type { margin-top: 4px; }

/* ─── PUBLICATIONS: Ko-fi store card ──────────────────── */
.store-card {
  display: flex; text-decoration: none; color: inherit;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; overflow: hidden; margin-bottom: 8px;
  transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
}
.store-card:hover { box-shadow: 0 4px 22px rgba(0,0,0,0.09); transform: translateY(-2px); border-color: var(--accent-border); }
.store-strip { width: 3px; flex-shrink: 0; background: var(--accent); }
.store-cover {
  width: 104px; flex-shrink: 0; align-self: stretch; object-fit: cover;
  border-right: 1px solid var(--border-light); background: var(--bg-alt);
}
.store-body { flex: 1; padding: 13px 18px 14px; min-width: 0; }
.store-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 9px; font-weight: 600;
  padding: 1px 6px; border-radius: 3px; letter-spacing: 0.05em; text-transform: uppercase;
  background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border);
  margin-bottom: 6px;
}
.store-title { font-family: var(--serif); font-size: 16px; font-weight: 600; line-height: 1.25; color: var(--text); letter-spacing: -0.01em; margin-bottom: 5px; }
.store-desc { font-family: var(--sans); font-size: 12.5px; color: var(--text-body); line-height: 1.5; margin-bottom: 10px; }
.store-footer { display: flex; justify-content: flex-end; align-items: center; }
.store-cta {
  font-family: var(--sans); font-size: 11.5px; font-weight: 600;
  padding: 4px 11px; border-radius: 4px;
  background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border);
}
.store-card:hover .store-cta { background: var(--accent); color: #fff; border-color: var(--accent); }

/* ─── HERO PILLARS (Direction A) ──────────────────────── */
.pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 28px; }
@media (max-width: 640px) { .pillars { grid-template-columns: 1fr; } }
.pillar-card {
  display: flex; flex-direction: column; gap: 6px; text-decoration: none;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 16px 18px; transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
}
.pillar-card:hover { box-shadow: 0 4px 22px var(--shadow); transform: translateY(-2px); border-color: var(--accent-border); }
.pillar-label { font-family: var(--mono); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.pillar-count { font-family: var(--serif); font-size: 28px; font-weight: 600; color: var(--text); line-height: 1; }
.pillar-meta { font-family: var(--sans); font-size: 12px; color: var(--text-muted); }
.pillar-link { font-family: var(--sans); font-size: 11.5px; font-weight: 600; color: var(--accent); margin-top: auto; }
```

- [ ] **Step 3: Verify the stylesheet is well-formed and complete**

Run: `grep -c '{' assets/site.css && grep -c '}' assets/site.css`
Expected: the two counts are equal (balanced braces).
Run: `grep -q '\-\-accent' assets/site.css && grep -q '.store-card' assets/site.css && grep -q '.pillar-card' assets/site.css && echo OK`
Expected: `OK` (variables + both new components present).

- [ ] **Step 4: Commit**

```bash
git add assets/site.css
git commit -m "Add /assets/site.css: extracted design system + store-card/pillars"
```

---

## Task 5: `index.template.html` + `build()` — pipeline reproduces today's homepage

Create the homepage template (CSS linked, article + publication blocks marker-driven) and wire `build()`. Goal of THIS task: the regenerated `index.html` is behaviorally equivalent to today's (same article list, same scripts) — the landing reorg is Task 6.

**Files:**
- Create: `templates/index.template.html`
- Modify: `build.js` (add `build()` + run-on-main)
- Create: `test/equivalence.check.js`

**Interfaces:**
- Consumes: all Task 1 render functions, `data/articles.json` (Task 2), `data/publications.json` (Task 3), `assets/site.css` (Task 4).
- Produces: generated `index.html`; `build()` exported from `build.js`.

- [ ] **Step 1: Snapshot the current homepage for the equivalence gate**

Run: `cp index.html index.html.orig`
(Working file only — `index.html.orig` is git-ignored in Step 7's `.gitignore` add; never commit it.)

- [ ] **Step 2: Create `templates/index.template.html` from the current homepage**

Copy `index.html` to `templates/index.template.html`, then apply exactly these edits (no others in this task):

1. Delete the entire inline `<head>` `<style> … </style>` block and replace it with:
   `<link rel="stylesheet" href="/assets/site.css">`
   Keep the inline pre-paint theme-selection `<script>` in `<head>` untouched.
2. In the `#research` section, replace the three hand-written publication card `<a>` elements (everything between the `<div class="section-heading">Publications</div>` line and the section's closing `</div>`) with:
   ```html
   <!-- BUILD:publications --><!-- /BUILD:publications -->
   ```
3. In the `#articles` section, replace the inner contents of `<div class="articles-list"> … </div>` (all the `.art-row` anchors) with:
   ```html
   <!-- BUILD:articles --><!-- /BUILD:articles -->
   ```
   Leave the search input, filter bar, flavor bar, pagination container, and all `<script>` blocks intact.

- [ ] **Step 3: Add `build()` to `build.js`**

Append to `build.js` (before `module.exports`, then add `build` to the exports).

**Important:** `injectBlocks` throws if a marker is missing, and the `pillars` marker is not added to the template until Task 6. So in THIS task `build()` injects only `publications` and `articles`. Task 6 Step 4 adds the `pillars` key back once its marker exists.

```js
function build(){
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT,'data/articles.json'),'utf8'));
  const pubs = JSON.parse(fs.readFileSync(path.join(ROOT,'data/publications.json'),'utf8'));
  const template = fs.readFileSync(path.join(ROOT,'templates/index.template.html'),'utf8');
  const counts = {
    writing: articles.length,
    papers: pubs.papers.length,
    booksDigital: pubs.books.length + pubs.digital.length,
  };
  const out = injectBlocks(template, {
    publications: renderPublications(pubs),
    articles: renderArticlesList(articles),
  });
  fs.writeFileSync(path.join(ROOT,'index.html'), out);
  return out;
}

if (require.main === module) build();
```

Add `build` to `module.exports`. (`counts` is computed here so Task 6 only needs to add the `pillars` line.)

- [ ] **Step 4: Write the equivalence check**

Create `test/equivalence.check.js` (asserts the regenerated article list preserves every slug + title, in newest-first order):

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function articleRefs(html){
  // capture [slug, title] for each art-row, in document order
  const re = /class="art-row[^"]*"\s+href="\/([^/"]+)\/"[\s\S]*?class="art-title">([^<]*)</g;
  const out = []; let m;
  while((m = re.exec(html))) out.push([m[1], m[2]]);
  return out;
}

test('regenerated article list matches the original (slug+title, order)', () => {
  const orig = articleRefs(fs.readFileSync(path.join(__dirname,'../index.html.orig'),'utf8'));
  const gen  = articleRefs(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'));
  assert.strictEqual(gen.length, 25, 'expected 25 rows generated');
  assert.deepStrictEqual(gen, orig, 'slug+title sequence must be identical to original');
});
```

- [ ] **Step 5: Generate and run the gate**

Run: `node build.js && node --test test/equivalence.check.js`
Expected: `index.html` is written; equivalence test PASSES (25 rows, identical slug+title order).

If it fails: the diff points to a migration error in `data/articles.json` (wrong order resolves via `date`; wrong title/slug is a data typo). Fix the data, re-run. Do not edit generated `index.html` by hand.

- [ ] **Step 6: Manual behavioral spot-check**

Run: `python3 -m http.server 8000` (then browse `http://localhost:8000/`), or open `index.html` directly. Confirm:
- The three Publications buckets render (Books / Papers / Digital) with the Ko-fi thumbnails.
- The article search box filters rows; Topic + Flavor filters work; pagination works.
- The theme toggle flips light/dark and persists on reload.
Stop the server when done.

- [ ] **Step 7: Commit**

```bash
echo "index.html.orig" >> .gitignore
git add templates/index.template.html build.js test/equivalence.check.js index.html .gitignore
git commit -m "Add homepage template + build() pipeline; generate index.html from data"
```

---

## Task 6: Landing Direction A — hero pillars, section reorder, About block

Apply the visual reframe in the template, then regenerate.

**Files:**
- Modify: `templates/index.template.html`
- Modify: `build.js` (re-add `pillars` to the `injectBlocks` call)

- [ ] **Step 1: Add the pillars marker to the hero**

In `templates/index.template.html`, inside the `<section class="hero">`, immediately after the `.hero-deck` paragraph (and before `.hero-meta` if present), insert:
```html
<!-- BUILD:pillars --><!-- /BUILD:pillars -->
```

- [ ] **Step 2: Reorder sections to `hero → #articles → #research → #about`**

Move the whole `#articles` `<section>` block to sit directly after the hero (before `#research`). Then move `#research` after `#articles`. (Cut/paste the existing blocks; do not alter their inner markup or the BUILD markers.)

- [ ] **Step 3: Consolidate Journey / Skills / Interests under one About block**

Wrap the existing `#journey`, `#tech`, and `#interests` `section`/`div` blocks together at the bottom of the page inside:
```html
<section class="section-anchor" id="about">
  <div class="section-label">About</div>
  <div class="section-heading">About</div>
  <!-- existing #journey, #tech, #interests blocks, in that order -->
</section>
```
Keep each inner block's own content intact (their sub-headings stay). If the nav has anchor links, update any `#journey` nav target to `#about`; add nav links for `#articles` and `#research` if Direction A's nav calls for Writing/Papers/Books pointers (optional — only if nav anchors already exist).

- [ ] **Step 4: Re-add `pillars` to the build injection**

In `build.js` `build()`, restore the three-key call:
```js
const out = injectBlocks(template, {
  pillars: renderPillars(counts),
  publications: renderPublications(pubs),
  articles: renderArticlesList(articles),
});
```

- [ ] **Step 5: Regenerate and verify counts + equivalence**

Run: `node build.js && node --test`
Expected: all tests PASS (the equivalence check still matches the 25 rows; nothing about the list changed).
Run: `grep -o 'class="pillar-count">[0-9]*' index.html`
Expected: three counts — `25`, `3`, `4` (Writing=articles, Papers=3, Books&Digital=1+3).

- [ ] **Step 6: Manual visual spot-check**

Open `index.html`. Confirm: hero shows three pillar cards with counts; order is hero → Articles → Publications → About; About contains Journey, Skills, Interests; light/dark both look right.

- [ ] **Step 7: Commit**

```bash
git add templates/index.template.html build.js index.html
git commit -m "Landing Direction A: hero pillars + section reorder + About block"
```

---

## Task 7: Point the article template at the shared stylesheet

New articles (via the `github-page-write` skill) become lean — inline CSS replaced by the shared `site.css`. Legacy articles untouched.

**Files:**
- Modify: `_template/article.html`

- [ ] **Step 1: Replace the template's inline CSS with the shared link**

In `_template/article.html`, delete the inline `<head>` `<style> … </style>` block and replace it with:
```html
<link rel="stylesheet" href="/assets/site.css">
```
Keep the pre-paint theme-selection `<script>`, the nav `.theme-toggle` button, and all `{{PLACEHOLDERS}}` intact.

- [ ] **Step 2: Verify the template no longer carries an inline style block**

Run: `grep -c '<style' _template/article.html`
Expected: `0`.
Run: `grep -q 'href="/assets/site.css"' _template/article.html && grep -q 'data-theme' _template/article.html && echo OK`
Expected: `OK` (shared CSS linked, theme script preserved).

- [ ] **Step 3: Confirm article-component classes exist in site.css**

The template uses article-only components (callout, code-block, data-table, plain-english, toc, dl, cards-grid). Verify they survived the Task 4 extraction:
Run: `for c in callout code-block data-table plain-english toc cards-grid; do grep -q "\.$c" assets/site.css && echo "$c ok" || echo "$c MISSING"; done`
Expected: every line `… ok`. If any is MISSING, those rules lived only in the article template's CSS, not the homepage's — copy the missing component rules from `_template/article.html`'s original `<style>` (recover via `git show HEAD:_template/article.html`) into `assets/site.css`, then re-run.

- [ ] **Step 4: Commit**

```bash
git add _template/article.html assets/site.css
git commit -m "Point _template/article.html at shared /assets/site.css"
```

---

## Final verification (after all tasks)

- [ ] Run full suite: `node --test` → all PASS.
- [ ] `node build.js` is clean and idempotent: run twice, `git diff --quiet index.html` after the second run.
- [ ] Legacy untouched: `git diff --name-only HEAD~7 -- '*/index.html' ':(exclude)templates/*'` lists no existing article directories (only the generated root `index.html`).
- [ ] Push (when approved):
  `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_github_personal -o IdentitiesOnly=yes" git push`

## Notes for the `github-page-write` skill (follow-up, not this plan)

After this lands, the per-post flow is: skill writes `topic-slug/index.html` (lean, links `/assets/site.css`), appends one entry to `data/articles.json`, runs `node build.js`, commits. Updating the skill's instructions to do the `articles.json` append + `build.js` run is a separate, small follow-up.
