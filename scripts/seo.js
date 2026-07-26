#!/usr/bin/env node
/**
 * SEO generator for tech.anujsadani.in
 *
 * Writes sitemap.xml, robots.txt and llms.txt from data/articles.json +
 * data/publications.json, then back-fills canonical / Open Graph / BlogPosting
 * JSON-LD into each article page that predates those tags being in the template.
 *
 *   node scripts/seo.js            apply
 *   node scripts/seo.js --dry-run  report what would change, write nothing
 *
 * Re-running is safe: pages already carrying an og:url are left alone, so this
 * never double-injects.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://tech.anujsadani.in';
const HOME = 'https://anujsadani.in';
const OG_IMAGE = SITE + '/assets/profile-pic.png';
const DRY = process.argv.includes('--dry-run');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));

/** Escape for an HTML attribute value. */
function attr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
/** Escape for XML text nodes. */
function xml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** JSON-LD payload: `<` is escaped so content can never break out of the script tag. */
function ld(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

const articles = readJSON('data/articles.json')
  .slice()
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const pubs = readJSON('data/publications.json');

const urlOf = (a) => `${SITE}/${a.slug}/`;

/* ── sitemap.xml ──────────────────────────────────────────────────────── */
function sitemap() {
  const newest = articles[0] && articles[0].date;
  const entries = [
    { loc: SITE + '/', lastmod: newest, changefreq: 'weekly', priority: '1.0' },
    ...articles.map((a) => ({
      loc: urlOf(a), lastmod: a.date, changefreq: 'yearly', priority: '0.8',
    })),
  ];
  const body = entries.map((e) => [
    '  <url>',
    `    <loc>${xml(e.loc)}</loc>`,
    e.lastmod ? `    <lastmod>${xml(e.lastmod)}</lastmod>` : null,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/* ── robots.txt ───────────────────────────────────────────────────────── */
function robots() {
  return `User-agent: *
Allow: /
Disallow: /drafts/
Disallow: /test/

Sitemap: ${SITE}/sitemap.xml
`;
}

/* ── llms.txt ─────────────────────────────────────────────────────────── */
function llms() {
  const lines = [];
  lines.push('# Anuj Sadani — Tech');
  lines.push('');
  lines.push('> Essays on AI engineering, infrastructure, and security by Anuj Sadani,');
  lines.push('> Principal Software Development Engineer at Infrrd. Enterprise RAG, agentic');
  lines.push('> workflows, evaluation pipelines, and the parts that break in production.');
  lines.push('');
  lines.push(`Author profile: ${HOME}`);
  lines.push('');
  lines.push('## Essays');
  lines.push('');
  articles.forEach((a) => {
    const desc = (a.desc || '').replace(/\s+/g, ' ').trim();
    lines.push(`- [${a.title}](${urlOf(a)})${desc ? ': ' + desc : ''}`);
  });

  if (Array.isArray(pubs.papers) && pubs.papers.length) {
    lines.push('');
    lines.push('## Papers');
    lines.push('');
    pubs.papers.forEach((p) => {
      lines.push(`- [${p.title}](${p.url})${p.id ? ` (${p.id})` : ''}`);
    });
  }
  if (Array.isArray(pubs.books) && pubs.books.length) {
    lines.push('');
    lines.push('## Books');
    lines.push('');
    pubs.books.forEach((b) => {
      lines.push(`- [${b.title}](${b.url})${b.subtitle ? ': ' + b.subtitle : ''}`);
    });
  }
  if (Array.isArray(pubs.digital) && pubs.digital.length) {
    lines.push('');
    lines.push('## Digital releases');
    lines.push('');
    pubs.digital.forEach((g) => lines.push(`- [${g.title}](${g.url})`));
  }

  lines.push('');
  lines.push('## Machine-readable indexes');
  lines.push('');
  lines.push(`- [Articles JSON](${SITE}/data/articles.json)`);
  lines.push(`- [Publications JSON](${SITE}/data/publications.json)`);
  lines.push('');
  return lines.join('\n');
}

/* ── per-article head tags ────────────────────────────────────────────── */
function headBlock(a, opts) {
  const url = urlOf(a);
  const desc = (a.desc || '').replace(/\s+/g, ' ').trim();
  const out = [];

  if (opts.needsDescription && desc) {
    out.push(`<meta name="description" content="${attr(desc)}">`);
  }
  out.push('<meta name="author" content="Anuj Sadani">');
  out.push(`<link rel="canonical" href="${url}">`);
  out.push('');
  out.push('<meta property="og:type" content="article">');
  out.push(`<meta property="og:url" content="${url}">`);
  out.push('<meta property="og:site_name" content="Anuj Sadani | Tech">');
  out.push(`<meta property="og:title" content="${attr(a.title)}">`);
  if (desc) out.push(`<meta property="og:description" content="${attr(desc)}">`);
  out.push(`<meta property="og:image" content="${OG_IMAGE}">`);
  if (a.date) out.push(`<meta property="article:published_time" content="${a.date}">`);
  out.push('<meta property="article:author" content="Anuj Sadani">');
  out.push('<meta name="twitter:card" content="summary_large_image">');
  out.push('');

  const json = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.title,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    isPartOf: { '@id': SITE + '/#blog' },
    author: {
      '@type': 'Person',
      '@id': HOME + '/#person',
      name: 'Anuj Sadani',
      url: HOME + '/',
    },
  };
  if (desc) json.description = desc;
  if (a.date) json.datePublished = a.date;
  if (Array.isArray(a.tags) && a.tags.length) json.keywords = a.tags.join(', ');

  out.push('<script type="application/ld+json">');
  out.push(ld(json));
  out.push('</script>');
  return out.join('\n');
}

/* ── back-fill existing article pages ─────────────────────────────────── */
function patchArticles() {
  const report = { patched: [], skipped: [], missing: [] };

  articles.forEach((a) => {
    const rel = path.join(a.slug, 'index.html');
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { report.missing.push(a.slug); return; }

    let html = fs.readFileSync(abs, 'utf8');
    if (/property=["']og:url["']/.test(html)) { report.skipped.push(a.slug); return; }

    const closeTitle = html.indexOf('</title>');
    if (closeTitle === -1) { report.missing.push(a.slug + ' (no <title>)'); return; }

    const block = headBlock(a, {
      needsDescription: !/<meta\s+name=["']description["']/i.test(html),
    });
    const at = closeTitle + '</title>'.length;
    html = html.slice(0, at) + '\n' + block + html.slice(at);

    if (!DRY) fs.writeFileSync(abs, html);
    report.patched.push(a.slug);
  });

  return report;
}

/* ── run ──────────────────────────────────────────────────────────────── */
function write(rel, content) {
  if (!DRY) fs.writeFileSync(path.join(ROOT, rel), content);
  console.log(`${DRY ? 'would write' : 'wrote'}  ${rel}  (${content.length} bytes)`);
}

write('sitemap.xml', sitemap());
write('robots.txt', robots());
write('llms.txt', llms());

const r = patchArticles();
console.log(`\narticles: ${r.patched.length} ${DRY ? 'to patch' : 'patched'}, ` +
            `${r.skipped.length} already tagged, ${r.missing.length} missing`);
if (r.patched.length) console.log('  patched: ' + r.patched.join(', '));
if (r.missing.length) console.log('  MISSING: ' + r.missing.join(', '));
