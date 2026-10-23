const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const seo = require('../scripts/seo.js');

const root = path.join(__dirname, '..');
const arts = JSON.parse(fs.readFileSync(path.join(root, 'data/articles.json'), 'utf8'));
const hosted = arts.filter((a) => !a.external && fs.existsSync(path.join(root, a.slug, 'index.html')));
const page = (a) => fs.readFileSync(path.join(root, a.slug, 'index.html'), 'utf8');
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test('every catalog entry that is not external has a page on disk', () => {
  const missing = arts.filter((a) => !a.external && !fs.existsSync(path.join(root, a.slug, 'index.html'))).map((a) => a.slug);
  assert.deepStrictEqual(missing, [], `catalog entries without a page: ${missing.join(', ')}`);
});

test('the homepage writing count matches the catalog (this drifted before: 44 shown, 45 listed)', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const shown = Number((home.match(/class="pillar-count">(\d+)</) || [])[1]);
  assert.strictEqual(shown, arts.length, `homepage says ${shown}, catalog has ${arts.length}. Run: node build.js`);
});

test('sitemap and llms.txt list every catalog entry', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
  for (const a of arts) {
    assert.ok(sitemap.includes(`<loc>${a.shareUrl}</loc>`), `${a.slug} missing from sitemap.xml (run node scripts/seo.js)`);
    assert.ok(llms.includes(a.shareUrl), `${a.slug} missing from llms.txt (run node scripts/seo.js)`);
  }
});

test('every hosted article has one canonical matching its catalog URL, one description, one h1', () => {
  for (const a of hosted) {
    const html = page(a);
    assert.strictEqual((html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1], a.shareUrl, `${a.slug}: canonical`);
    assert.strictEqual((html.match(/<meta\s+name=["']description["']/gi) || []).length, 1, `${a.slug}: needs exactly one meta description`);
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, `${a.slug}: needs exactly one h1`);
  }
});

test('structured data on every hosted article parses and names the article', () => {
  for (const a of hosted) {
    const blocks = ldBlocks(page(a));
    assert.ok(blocks.length >= 1, `${a.slug}: no JSON-LD`);
    const nodes = blocks.flatMap((b) => { const d = JSON.parse(b); return d['@graph'] || [d]; });
    const post = nodes.find((n) => n['@type'] === 'BlogPosting');
    assert.ok(post, `${a.slug}: no BlogPosting`);
    assert.strictEqual(post.url, a.shareUrl, `${a.slug}: BlogPosting url`);
    assert.strictEqual(post.datePublished, a.date, `${a.slug}: datePublished`);
  }
});

test('pages managed by seo.js are in sync with the catalog and identity (re-run node scripts/seo.js if this fails)', () => {
  for (const a of hosted) {
    const html = page(a);
    if (!seo.MARK_RE.test(html)) continue; // hand-tuned legacy pages are left alone on purpose
    const needsDescription = !/<meta\s+name=["']description["']/i.test(html.replace(seo.MARK_RE, ''));
    const next = seo.applyHead(html, seo.headBlock(a, { needsDescription }), { refresh: false }).html;
    assert.strictEqual(next, html, `${a.slug}: head block is out of date`);
  }
});

test('a catalog "modified" date reaches the page as dateModified on managed pages', () => {
  for (const a of hosted.filter((x) => x.modified)) {
    const html = page(a);
    if (!seo.MARK_RE.test(html)) continue;
    assert.match(html, new RegExp(`"dateModified": "${a.modified}"`), `${a.slug}: dateModified`);
    assert.ok(html.includes(`<meta property="article:modified_time" content="${a.modified}">`), `${a.slug}: article:modified_time`);
  }
});

test('migrating a legacy head keeps the description (it used to be dropped silently)', () => {
  const legacy = '<html><head><title>T</title>\n<meta name="description" content="Keep me">\n<link rel="canonical" href="https://x/">\n<meta property="og:url" content="https://x/">\n<script type="application/ld+json">{}</script>\n</head><body></body></html>';
  const a = { slug: 't', title: 'T', desc: 'Keep me', date: '2026-01-01', tags: ['x'] };
  const out = seo.applyHead(legacy, seo.headBlock(a, { needsDescription: false }), { refresh: true });
  assert.strictEqual(out.how, 'migrated');
  assert.strictEqual((out.html.match(/name="description"/g) || []).length, 1);
  assert.ok(out.html.includes('content="Keep me"'));
});

test('--only limits the back-fill: a page outside the list is left untouched', () => {
  const r = require('child_process').spawnSync('node', [path.join(root, 'scripts/seo.js'), '--dry-run', '--refresh', '--only=windows-to-mac-ai-setup'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /articles: 0 to patch, 1 updated/);
});
