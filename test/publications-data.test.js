const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const b = require('../build.js');

const pubs = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/publications.json'),'utf8'));

test('bucket counts: 1 book, 3 papers, 5 digital', () => {
  assert.strictEqual(pubs.books.length, 1);
  assert.strictEqual(pubs.papers.length, 3);
  assert.strictEqual(pubs.digital.length, 5);
});

test('every paper has a dateDisplay string and the SSRN paper is present', () => {
  for(const p of pubs.papers){
    assert.ok(typeof p.dateDisplay === 'string' && p.dateDisplay.length > 0, `missing dateDisplay on ${p.id}`);
  }
  assert.ok(pubs.papers.some(p => /6071412/.test(p.url)), 'SSRN paper (6071412) missing');
});

test('every paper has a self-authored entry and a real abstract URL', () => {
  for(const p of pubs.papers){
    assert.ok(p.authors.some(a => a.self), `no self author on ${p.id}`);
    assert.match(p.url, /^https:\/\//, `bad url on ${p.id}`);
    assert.ok(p.title && p.title.trim().length > 0, `empty title on ${p.id}`);
  }
});

test('every Ko-fi product has an on-disk cover image + non-empty description', () => {
  const urls = pubs.digital.map(d=>d.url);
  for(const koFi of [
    'https://ko-fi.com/s/2806feff25',
    'https://ko-fi.com/s/70b71a3671',
    'https://ko-fi.com/s/02e8517c71',
    'https://ko-fi.com/s/b7efb1eb2e',
    'https://ko-fi.com/s/3be014f2e6',
  ]){
    assert.ok(urls.includes(koFi), `missing product ${koFi}`);
  }
  for(const d of pubs.digital){
    assert.ok(/\.(png|jpe?g|webp)$/i.test(d.image || ''), `missing/invalid image on ${d.url}`);
    // image path is site-absolute ("/...") — resolve it against the repo root
    const file = path.join(__dirname, '..', d.image.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), `cover file not found on disk for ${d.url}: ${d.image}`);
    assert.ok(d.desc && d.desc.trim().length > 0, `empty desc on ${d.url}`);
  }
});

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
