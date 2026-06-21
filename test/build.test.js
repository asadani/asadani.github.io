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

const ART = (over={}) => ({ slug:'demo', title:'T &amp; U', tags:['ai-engineering'],
  flavors:['models','research'], quote:'"hi"', desc:'D', date:'2026-06-18',
  dateDisplay:'June 18, 2026', cta:'Read', shareUrl:'https://x/demo/', ...over });

test('renderArticlesList sorts by date descending (stable)', () => {
  const arts = [
    ART({ slug:'a', date:'2026-01-01' }),
    ART({ slug:'b', date:'2026-03-01' }),
  ];
  const html = b.renderArticlesList(arts);
  assert.ok(html.indexOf('href="/b/"') < html.indexOf('href="/a/"'), 'newer (b) must come first');
});

test('renderArticleRow carries data attributes, topic class, raw title', () => {
  const html = b.renderArticleRow(ART());
  assert.match(html, /class="art-row art-ai"/);
  assert.match(html, /data-tags="ai-engineering"/);
  assert.match(html, /data-flavors="models research"/);
  assert.match(html, /<span class="art-title">T &amp; U<\/span>/); // raw HTML preserved
  assert.match(html, /class="art-quote">"hi"</);                   // literal quotes preserved
  assert.match(html, /class="art-link">Read →</);
});

test('renderArticleRow preserves inline HTML (code tags) in desc, derives share title', () => {
  const html = b.renderArticleRow(ART({ title:'A "B"', desc:'use <code>x</code> now' }));
  assert.match(html, /<div class="art-desc">use <code>x<\/code> now<\/div>/); // not escaped
  assert.match(html, /data-title="A &quot;B&quot;"/);                          // quotes escaped in attr
});

test('renderArticleRow omits flavors markup when there are none', () => {
  const html = b.renderArticleRow(ART({ flavors:[] }));
  assert.ok(!/data-flavors=/.test(html), 'no data-flavors attribute');
  assert.ok(!/card-flavors/.test(html), 'no card-flavors span');
});

test('renderArticleRow supports multi-tag rows and custom CTA', () => {
  const html = b.renderArticleRow(ART({ tags:['interactive','ai-engineering'], cta:'Explore' }));
  assert.match(html, /class="art-row art-interactive"/);
  assert.match(html, /class="art-badge badge-interactive">Interactive</);
  assert.match(html, /data-tags="interactive ai-engineering"/);
  assert.match(html, /class="art-link">Explore →</);
});

test('venueFor derives venue from type + paper badge', () => {
  assert.deepStrictEqual(b.venueFor('books', {}),   { key:'amazon', label:'Amazon' });
  assert.deepStrictEqual(b.venueFor('digital', {}), { key:'kofi',   label:'Ko-fi' });
  assert.deepStrictEqual(b.venueFor('papers', { badge:'arXiv' }), { key:'arxiv', label:'arXiv' });
  assert.deepStrictEqual(b.venueFor('papers', { badge:'SSRN' }),  { key:'ssrn',  label:'SSRN' });
});

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
