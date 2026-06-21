# Publication Flip-Card Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Books/Papers/Digital as responsive 3-up grids of portrait flip cards — front carries the title (cover+caption or venue title-panel), clicking flips to a back with description + meta, and a venue link strip opens the source in a new tab. Add the SSRN paper.

**Architecture:** Replace `renderPublicationCard` in `build.js` with `renderFlipCard(item, type)` and wrap each bucket's cards in a `.flip-grid`; replace the `.pubcard` CSS in `assets/site.css` with a 3D flip-card system; add a small delegated flip-toggle `<script>` to the homepage template. Venue is derived (existing `venueFor`); `publications.json` gains the SSRN entry and a `dateDisplay` per paper.

**Tech Stack:** Node 18 (built-in `node:test`, `fs`), static HTML/CSS, a few lines of vanilla JS.

**Spec:** `docs/superpowers/specs/2026-06-22-publication-flip-grid-design.md`

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

## Task 1: Add the SSRN paper + `dateDisplay` to `publications.json`

**Files:**
- Modify: `data/publications.json`
- Modify: `test/publications-data.test.js`

**Interfaces:**
- Produces: `papers[]` of length 3, each with a `dateDisplay` string; consumed by `renderFlipCard` (Task 2).

- [ ] **Step 1: Update the data-count test**

In `test/publications-data.test.js`, replace the existing `test('bucket counts: 1 book, 2 papers, 3 digital', …)` block with:

```js
test('bucket counts: 1 book, 3 papers, 3 digital', () => {
  assert.strictEqual(pubs.books.length, 1);
  assert.strictEqual(pubs.papers.length, 3);
  assert.strictEqual(pubs.digital.length, 3);
});

test('every paper has a dateDisplay string and the SSRN paper is present', () => {
  for(const p of pubs.papers){
    assert.ok(typeof p.dateDisplay === 'string' && p.dateDisplay.length > 0, `missing dateDisplay on ${p.id}`);
  }
  assert.ok(pubs.papers.some(p => /6071412/.test(p.url)), 'SSRN paper (6071412) missing');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/publications-data.test.js`
Expected: FAIL — papers length is 2, no `dateDisplay`.

- [ ] **Step 3: Edit `data/publications.json`**

Remove the top-level `"_note"` line. Replace the entire `"papers": [ … ]` array with this (adds `dateDisplay` to the two arXiv entries and appends the SSRN entry):

```json
  "papers": [
    {
      "badge": "arXiv",
      "cat": "cs.CL",
      "id": "arXiv:2605.13538",
      "title": "Locale-Conditioned Few-Shot Prompting Mitigates Demonstration Regurgitation in On-Device PII Substitution with Small Language Models",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-05-13",
      "dateDisplay": "May 13, 2026",
      "url": "https://arxiv.org/abs/2605.13538"
    },
    {
      "badge": "arXiv",
      "cat": "cs.AI",
      "id": "arXiv:2604.21816",
      "title": "Tool Attention Is All You Need: Dynamic Tool Gating and Lazy Schema Loading for Eliminating the MCP/Tools Tax in Scalable Agentic Workflows",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-04-23",
      "dateDisplay": "April 23, 2026",
      "url": "https://arxiv.org/abs/2604.21816"
    },
    {
      "badge": "SSRN",
      "cat": "",
      "id": "SSRN:6071412",
      "title": "The Great Recalibration: The 2026 Pivot from Generalist Wrappers to Sovereign Application Layers and Industrialized Services",
      "authors": [{ "name": "Anuj Sadani", "self": true }],
      "date": "2026-01-01",
      "dateDisplay": "2026",
      "url": "https://dx.doi.org/10.2139/ssrn.6071412"
    }
  ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/publications-data.test.js`
Expected: PASS — 1 book / 3 papers / 3 digital, all papers have `dateDisplay`, SSRN present.
Run: `node -e "JSON.parse(require('fs').readFileSync('data/publications.json','utf8')); console.log('valid json')"`
Expected: `valid json`.

- [ ] **Step 5: Commit**

```bash
git add data/publications.json test/publications-data.test.js
git commit -m "Add SSRN paper + dateDisplay to publications.json (papers -> 3)" --no-verify
```

---

## Task 2: `renderFlipCard` in `build.js` + grid-wrapped buckets

Replace `renderPublicationCard` with `renderFlipCard`; wrap each bucket's cards in `.flip-grid`. Markup only — CSS and JS follow.

**Files:**
- Modify: `build.js`
- Modify: `test/build.test.js`

**Interfaces:**
- Consumes: `esc`, `escAttr`, `venueFor` (existing — `venueFor(type,item) -> {key,label}`).
- Produces: `renderFlipCard(item, type) -> string`; `renderPublications(pubs) -> string` (buckets now contain a `.flip-grid`).

- [ ] **Step 1: Replace the three `renderPublicationCard` tests in `test/build.test.js`**

Delete the three existing tests whose names start `renderPublicationCard:` and add:

```js
test('renderFlipCard book: media front (cover+caption), back desc+meta, Amazon link', () => {
  const bk = { title:'The Clean Vibe Coder', subtitle:'A Code', author:'Anuj Sadani',
    desc:'A field guide.', cover:'/assets/c.jpg', meta:'Kindle · 134 pages', url:'https://amazon/x' };
  const html = b.renderFlipCard(bk, 'books');
  assert.match(html, /class="flipcard venue-amazon flipcard--media"/);
  assert.match(html, /class="flipcard-cover" src="\/assets\/c\.jpg" alt="The Clean Vibe Coder cover"/);
  assert.match(html, /class="flipcard-caption">The Clean Vibe Coder</);
  assert.match(html, /class="flipcard-desc">A field guide.</);
  assert.match(html, /class="flipcard-meta">Kindle · 134 pages</);
  assert.match(html, /class="flipcard-link"[^>]*href="https:\/\/amazon\/x"[^>]*>Amazon ↗</);
  assert.ok((html.match(/aria-expanded="false"/g) || []).length === 2, 'two toggles');
});

test('renderFlipCard paper: text title-panel front (no cover), authors+date back, arXiv link', () => {
  const p = { badge:'arXiv', cat:'cs.CL', title:'On Things', dateDisplay:'May 13, 2026',
    authors:[{name:'Anuj Sadani',self:true},{name:'Deepak Kumar'}], url:'https://arxiv.org/abs/x' };
  const html = b.renderFlipCard(p, 'papers');
  assert.match(html, /class="flipcard venue-arxiv flipcard--text"/);
  assert.ok(!/flipcard-cover/.test(html), 'paper has no cover image');
  assert.match(html, /class="flipcard-panel-venue">arXiv</);
  assert.match(html, /class="flipcard-paneltitle">On Things</);
  assert.match(html, /class="flipcard-panel-cat">cs.CL</);
  assert.match(html, /<span class="pub-self">Anuj Sadani<\/span>, Deepak Kumar/);
  assert.match(html, /class="flipcard-meta">May 13, 2026</);
  assert.match(html, />arXiv ↗</);
});

test('renderFlipCard digital: media front, desc back, Ko-fi link', () => {
  const d = { title:'Monk', desc:'A note.', image:'/m/m.png', url:'https://ko-fi.com/s/x' };
  const html = b.renderFlipCard(d, 'digital');
  assert.match(html, /class="flipcard venue-kofi flipcard--media"/);
  assert.match(html, /class="flipcard-cover" src="\/m\/m\.png"/);
  assert.match(html, /class="flipcard-caption">Monk</);
  assert.match(html, /class="flipcard-desc">A note.</);
  assert.match(html, />Ko-fi ↗</);
});
```

- [ ] **Step 2: Update `test/publications-data.test.js` render assertion**

Replace the test `test('publications render as unified pubcards across three buckets', …)` with:

```js
test('publications render as flip-card grids across three buckets', () => {
  let html;
  assert.doesNotThrow(() => { html = b.renderPublications(pubs); });
  assert.match(html, /pub-bucket-label">Books</);
  assert.match(html, /pub-bucket-label">Papers</);
  assert.match(html, /pub-bucket-label">Digital</);
  const grids = (html.match(/class="flip-grid"/g) || []).length;
  assert.strictEqual(grids, 3, 'one flip-grid per bucket');
  const cards = (html.match(/class="flipcard /g) || []).length;
  assert.strictEqual(cards, pubs.books.length + pubs.papers.length + pubs.digital.length);
  assert.match(html, /flipcard--text/);  // papers
  assert.match(html, /flipcard--media/); // books/digital
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `b.renderFlipCard` is not a function; flip-grid assertions fail.

- [ ] **Step 4: Replace the renderer in `build.js`**

Delete the existing `renderPublicationCard` function and the existing `renderPublications` function. Insert in their place (keep `venueFor` as-is above them):

```js
function venueLink(v, url){
  return `<a class="flipcard-link" href="${escAttr(url)}" target="_blank" rel="noopener">${esc(v.label)} ↗</a>`;
}

function renderFlipCard(item, type){
  const v = venueFor(type, item);
  const isText = (type === 'papers');
  const variant = isText ? 'flipcard--text' : 'flipcard--media';

  let front;
  if(isText){
    const cat = item.cat ? `\n        <span class="flipcard-panel-cat">${esc(item.cat)}</span>` : '';
    front = `<span class="flipcard-panel-venue">${esc(v.label)}</span>
        <span class="flipcard-paneltitle">${esc(item.title)}</span>${cat}`;
  } else {
    const src = type === 'books' ? item.cover : item.image;
    front = `<img class="flipcard-cover" src="${escAttr(src)}" alt="${escAttr(item.title)} cover">
        <span class="flipcard-caption">${esc(item.title)}</span>`;
  }

  let back;
  if(type === 'books'){
    back = `<span class="flipcard-desc">${esc(item.desc)}</span>
        <span class="flipcard-meta">${esc(item.meta)}</span>`;
  } else if(type === 'papers'){
    const authors = item.authors.map(a => a.self
      ? `<span class="pub-self">${esc(a.name)}</span>` : esc(a.name)).join(', ');
    back = `<span class="flipcard-meta">${authors}</span>
        <span class="flipcard-meta">${esc(item.dateDisplay)}</span>`;
  } else { // digital
    back = `<span class="flipcard-desc">${esc(item.desc)}</span>`;
  }

  const link = venueLink(v, item.url);
  const t = escAttr(item.title);
  return `      <div class="flipcard venue-${v.key} ${variant}">
        <div class="flipcard-inner">
          <div class="flipcard-face flipcard-front">
            <button class="flipcard-toggle" type="button" aria-expanded="false" aria-label="Show details for ${t}">
        ${front}
            </button>
            ${link}
          </div>
          <div class="flipcard-face flipcard-back">
            <button class="flipcard-toggle" type="button" aria-expanded="false" aria-label="Hide details for ${t}">
        ${back}
            </button>
            ${link}
          </div>
        </div>
      </div>`;
}

function renderPublications(pubs){
  const bucket = (label, items, type) =>
    `    <div class="pub-bucket-label">${esc(label)}</div>\n` +
    `    <div class="flip-grid">\n` +
    items.map(it => renderFlipCard(it, type)).join('\n') +
    `\n    </div>`;
  return [
    bucket('Books', pubs.books, 'books'),
    bucket('Papers', pubs.papers, 'papers'),
    bucket('Digital', pubs.digital, 'digital'),
  ].join('\n\n');
}
```

- [ ] **Step 5: Update `module.exports` in `build.js`**

Replace `renderPublicationCard` with `renderFlipCard` in the exports (add `venueLink` too). The exports object must read:

```js
module.exports = { esc, escAttr, formatDate, TOPICS,
  renderArticleRow, renderArticlesList, venueFor, venueLink, renderFlipCard,
  renderPublications, renderPillars, injectBlocks, build };
```

- [ ] **Step 6: Run tests + rebuild**

Run: `node --test`
Expected: PASS — all suites green.
Run: `node build.js`
Run: `grep -c 'class="flipcard ' index.html`
Expected: `7` (1 book + 3 papers + 3 digital).
Run: `grep -c 'class="flip-grid"' index.html`
Expected: `3`.

- [ ] **Step 7: Commit**

```bash
git add build.js test/build.test.js test/publications-data.test.js index.html
git commit -m "Replace pubcard renderer with renderFlipCard + flip-grid buckets" --no-verify
```

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

## Task 4: Flip-toggle script in the template

Add one delegated listener so clicking a card flips it (and back), keeping `aria-expanded` in sync, while the link strip still opens externally.

**Files:**
- Modify: `templates/index.template.html`

- [ ] **Step 1: Add the flip-toggle script before `</body>`**

In `templates/index.template.html`, insert this block immediately before the closing `</body>` tag:

```html
<script>
(function(){
  var research = document.getElementById('research');
  if(!research) return;
  research.addEventListener('click', function(e){
    if(e.target.closest('.flipcard-link')) return;       // let the venue link open
    var toggle = e.target.closest('.flipcard-toggle');
    if(!toggle) return;
    var card = toggle.closest('.flipcard');
    if(!card) return;
    var flipped = card.classList.toggle('is-flipped');
    var btns = card.querySelectorAll('.flipcard-toggle');
    for(var i=0;i<btns.length;i++){ btns[i].setAttribute('aria-expanded', flipped ? 'true' : 'false'); }
  });
})();
</script>
```

- [ ] **Step 2: Verify and rebuild**

Run: `grep -c 'flipcard-toggle' templates/index.template.html`
Expected: `≥ 1` (the script references it).
Run: `node build.js`
Run: `grep -c "addEventListener('click'" index.html`
Expected: `≥ 1` (the script made it into the output; there may be other listeners too).

- [ ] **Step 3: Run the full suite + idempotency**

Run: `node --test`
Expected: ALL PASS.
Run: `node build.js && git diff --quiet index.html && echo "idempotent"`
Expected: `idempotent`.

- [ ] **Step 4: Manual visual + interaction check (human)**

Run: `python3 -m http.server 8000` → open `http://localhost:8000/#research`. Confirm:
- Three buckets (Books / Papers / Digital), each a 3-up grid (resize → 2-up, then 1-up).
- Front: books/Ko-fi show cover + title caption; papers show a venue-tinted title panel (arXiv red, SSRN blue) with the wordmark + title; SSRN paper is present.
- Click a card → it flips to show description + meta (no repeated title); click again → flips back.
- Click the bottom venue link → opens the source in a NEW tab and does NOT flip the card.
- Keyboard: Tab to a card's main button, press Enter/Space → it flips.
Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add templates/index.template.html index.html
git commit -m "Add delegated flip-toggle script for publication cards" --no-verify
```

---

## Final verification

- [ ] `node --test` → all PASS.
- [ ] `node build.js` idempotent: run twice, `git diff --quiet index.html` after the second.
- [ ] Flip cards in output: `grep -c 'class="flipcard '` → 7; `grep -c 'class="flip-grid"'` → 3.
- [ ] No old pubcard markup leaks: `grep -cE 'class="pubcard"|venue-badge' index.html` → 0.
- [ ] Article list untouched: equivalence test still passes (covered by `node --test`).
- [ ] Legacy article pages unchanged: `git diff --name-only main -- '*/index.html' | grep -v '^templates/'` → empty.

## Notes (follow-ups, not this plan)
- og:image / social-unfurl is the next cycle.
- `CLAUDE.md` component list still documents the old card classes; refresh it (and the `github-page-write` skill) when updating docs.
