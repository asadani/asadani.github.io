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
