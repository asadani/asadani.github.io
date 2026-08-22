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

