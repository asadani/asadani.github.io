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

