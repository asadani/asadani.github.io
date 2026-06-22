const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function articleRefs(html){
  // [slug, title] for each art-row, in document order
  const re = /class="art-row[^"]*"\s+href="\/([^/"]+)\/"[\s\S]*?class="art-title">([\s\S]*?)</g;
  const out = []; let m;
  while((m = re.exec(html))) out.push([m[1], m[2]]);
  return out;
}

test('regenerated article list matches the original (slug+title, order)', () => {
  const orig = articleRefs(fs.readFileSync(path.join(__dirname,'../index.html.orig'),'utf8'));
  const gen  = articleRefs(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'));
  assert.strictEqual(gen.length, 24, 'expected 24 rows generated');
  assert.deepStrictEqual(gen, orig, 'slug+title sequence must be identical to original');
});
