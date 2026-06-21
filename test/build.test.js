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
