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
