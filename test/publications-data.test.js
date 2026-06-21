const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const b = require('../build.js');

const pubs = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/publications.json'),'utf8'));

// NOTE: papers is 2 (arXiv) until the SSRN entry (abstract_id=6071412) gets its
// title/date from the author; bump to 3 when that lands.
test('bucket counts: 1 book, 2 papers, 3 digital', () => {
  assert.strictEqual(pubs.books.length, 1);
  assert.strictEqual(pubs.papers.length, 2);
  assert.strictEqual(pubs.digital.length, 3);
});

test('every paper has a self-authored entry and a real abstract URL', () => {
  for(const p of pubs.papers){
    assert.ok(p.authors.some(a => a.self), `no self author on ${p.id}`);
    assert.match(p.url, /^https:\/\//, `bad url on ${p.id}`);
    assert.ok(p.title && p.title.trim().length > 0, `empty title on ${p.id}`);
  }
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

test('publications render without throwing and emit all three buckets', () => {
  let html;
  assert.doesNotThrow(() => { html = b.renderPublications(pubs); });
  assert.match(html, /pub-bucket-label">Books</);
  assert.match(html, /pub-bucket-label">Papers</);
  assert.match(html, /pub-bucket-label">Digital</);
  assert.match(html, /class="store-card"/);
  assert.match(html, /class="book-card"/);
  assert.match(html, /class="pub-card"/);
});
