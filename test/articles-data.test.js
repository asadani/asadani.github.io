const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const b = require('../build.js');

const arts = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/articles.json'),'utf8'));

test('all 24 existing articles are present', () => {
  assert.strictEqual(arts.length, 24);
});

test('every article has required fields and a known primary topic', () => {
  for(const a of arts){
    for(const k of ['slug','title','tags','flavors','quote','desc','date','dateDisplay','cta','shareUrl']){
      assert.ok(a[k] !== undefined, `missing ${k} on ${a.slug}`);
    }
    assert.ok(Array.isArray(a.tags) && a.tags.length >= 1, `bad tags on ${a.slug}`);
    assert.ok(Array.isArray(a.flavors), `bad flavors on ${a.slug}`);
    assert.ok(b.TOPICS[a.tags[0]], `unknown primary topic ${a.tags[0]} on ${a.slug}`);
    assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/, `bad date on ${a.slug}`);
  }
});

test('every article renders without throwing', () => {
  assert.doesNotThrow(() => b.renderArticlesList(arts));
});

test('slugs are unique', () => {
  assert.strictEqual(new Set(arts.map(a=>a.slug)).size, arts.length);
});
