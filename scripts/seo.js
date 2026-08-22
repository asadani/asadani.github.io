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
// Re-tag pages that predate the SEO:HEAD markers, so an identity change
// (a new ORCID, say) reaches every page rather than only untagged ones.
const REFRESH = process.argv.includes('--refresh');

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
const identity = readJSON('data/identity.json');

const urlOf = (a) => `${SITE}/${a.slug}/`;

/* Books with a readable edition hosted here. These are NOT in articles.json --
   they are book-forge output, not template articles -- so nothing else in this
   file would have found them, and they were missing from the sitemap. */
const hostedBooks = (pubs.digital || [])
  .filter((b) => b.hosted)
  .map((b) => Object.assign({}, b, {
    slug: b.hosted.replace(/^\/|\/$/g, ''),
    loc: SITE + b.hosted,
  }));

/* ── the Person, emitted on every page ────────────────────────────────────
   One weak assertion becomes 35 consistent ones. Search and answer engines
   merge an entity when independent sources carry the same identifiers, so the
   value is in the repetition and in the reciprocal links from each profile. */
function personNode() {
  const ids = identity.identifier || {};
  const idUrls = [
    ids.orcid && `https://orcid.org/${ids.orcid}`,
    ids.wikidata && `https://www.wikidata.org/wiki/${ids.wikidata}`,
    ids.googleScholar && `https://scholar.google.com/citations?user=${ids.googleScholar}`,
    ids.semanticScholar && `https://www.semanticscholar.org/author/${ids.semanticScholar}`,
    ids.amazonAuthor && `https://www.amazon.in/stores/author/${ids.amazonAuthor}`,
    ids.openLibrary && `https://openlibrary.org/authors/${ids.openLibrary}`,
    ids.arxivAuthor && `https://arxiv.org/a/${ids.arxivAuthor}`,
  ].filter(Boolean);

  const node = {
    '@type': 'Person',
    '@id': HOME + '/#person',
    name: identity.name,
    givenName: identity.givenName,
    familyName: identity.familyName,
    url: identity.url,
    image: identity.image,
    jobTitle: identity.jobTitle,
    description: identity.description,
    sameAs: (identity.sameAs || []).concat(idUrls),
  };
  if (identity.worksFor) {
    node.worksFor = { '@type': 'Organization', name: identity.worksFor.name,
                      url: identity.worksFor.url };
  }
  if (identity.alumniOf) {
    node.alumniOf = { '@type': 'CollegeOrUniversity', name: identity.alumniOf };
  }
  if (identity.homeLocation) {
    node.homeLocation = { '@type': 'Place', name: identity.homeLocation };
  }
  if (Array.isArray(identity.knowsAbout)) node.knowsAbout = identity.knowsAbout;
  // ORCID is the one identifier academic graphs resolve on; state it as such.
  if (ids.orcid) {
    node.identifier = { '@type': 'PropertyValue', propertyID: 'ORCID',
                        value: ids.orcid };
  }
  return node;
}

/* ── sitemap.xml ──────────────────────────────────────────────────────── */
function sitemap() {
  const newest = articles[0] && articles[0].date;
  const entries = [
    { loc: SITE + '/', lastmod: newest, changefreq: 'weekly', priority: '1.0' },
    ...articles.map((a) => ({
      loc: urlOf(a), lastmod: a.date, changefreq: 'yearly', priority: '0.8',
    })),
    // Book editions rank above ordinary essays: they are the long-form work
    // and the pages most worth surfacing.
    ...hostedBooks.map((b) => ({
      loc: b.loc, lastmod: b.datePublished, changefreq: 'yearly', priority: '0.9',
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
    // Point at the readable edition where one exists -- an answer engine can
    // use that; it cannot use a Ko-fi checkout page.
    pubs.digital.forEach((g) => {
      const desc = (g.desc || '').replace(/\s+/g, ' ').trim();
      if (g.hosted) {
        lines.push(`- [${g.title}](${SITE}${g.hosted}): ${desc} ` +
                   `Full text online; PDF at ${g.url}.`);
      } else {
        lines.push(`- [${g.title}](${g.url})${desc ? ': ' + desc : ''}`);
      }
    });
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

  const post = {
    '@type': 'BlogPosting',
    headline: a.title,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    isPartOf: { '@id': SITE + '/#blog' },
    author: { '@id': HOME + '/#person' },
    publisher: { '@id': HOME + '/#person' },
  };
  if (desc) post.description = desc;
  if (a.date) post.datePublished = a.date;
  if (Array.isArray(a.tags) && a.tags.length) post.keywords = a.tags.join(', ');

  out.push('<script type="application/ld+json">');
  out.push(ld({ '@context': 'https://schema.org', '@graph': [personNode(), post] }));
  out.push('</script>');
  return out.join('\n');
}

/* ── head tags for a hosted book edition ──────────────────────────────────
   Book, not BlogPosting: these are long-form works sold as books, and the
   distinction is what lets an answer engine say "Anuj Sadani wrote X" rather
   than "a blog mentioned X". The Ko-fi listing rides along as an Offer. */
function bookHeadBlock(b, opts) {
  const url = b.loc;
  const desc = (b.desc || '').replace(/\s+/g, ' ').trim();
  const out = [];

  if (opts.needsDescription && desc) {
    out.push(`<meta name="description" content="${attr(desc)}">`);
  }
  out.push('<meta name="author" content="Anuj Sadani">');
  out.push(`<link rel="canonical" href="${url}">`);
  out.push('');
  out.push('<meta property="og:type" content="book">');
  out.push(`<meta property="og:url" content="${url}">`);
  out.push('<meta property="og:site_name" content="Anuj Sadani | Tech">');
  out.push(`<meta property="og:title" content="${attr(b.title)}">`);
  if (desc) out.push(`<meta property="og:description" content="${attr(desc)}">`);
  out.push(`<meta property="og:image" content="${SITE}${b.image || '/assets/profile-pic.png'}">`);
  if (b.datePublished) {
    out.push(`<meta property="book:release_date" content="${b.datePublished}">`);
  }
  out.push('<meta property="book:author" content="Anuj Sadani">');
  out.push('<meta name="twitter:card" content="summary_large_image">');
  out.push('');

  const book = {
    '@type': 'Book',
    '@id': url + '#book',
    name: b.title,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    bookFormat: 'https://schema.org/EBook',
    author: { '@id': HOME + '/#person' },
    publisher: { '@id': HOME + '/#person' },
  };
  if (desc) book.description = desc;
  if (b.datePublished) book.datePublished = b.datePublished;
  if (b.pages) book.numberOfPages = b.pages;
  if (b.isbn) book.isbn = b.isbn;
  if (b.image) book.image = SITE + b.image;
  if (b.url) {
    book.offers = { '@type': 'Offer', url: b.url,
                    availability: 'https://schema.org/InStock' };
  }

  out.push('<script type="application/ld+json">');
  out.push(ld({ '@context': 'https://schema.org', '@graph': [personNode(), book] }));
  out.push('</script>');
  return out.join('\n');
}

/* ── injected-block markers ───────────────────────────────────────────────
   Wrapping the block makes re-running an update rather than a skip, which
   matters: when an ORCID or Wikidata id is added to identity.json, every page
   has to pick it up. Pages tagged before markers existed are migrated by
   --refresh, which replaces the old contiguous block after </title>. */
const MARK_OPEN = '<!-- SEO:HEAD -->';
const MARK_CLOSE = '<!-- /SEO:HEAD -->';
const MARK_RE = /<!-- SEO:HEAD -->[\s\S]*?<!-- \/SEO:HEAD -->/;

function wrapBlock(block) {
  return `${MARK_OPEN}\n${block}\n${MARK_CLOSE}`;
}

/** Replace a marked block, migrate a legacy one, or inject fresh. */
function applyHead(html, block, opts) {
  const wrapped = wrapBlock(block);

  if (MARK_RE.test(html)) {
    return { html: html.replace(MARK_RE, wrapped), how: 'updated' };
  }

  const hasLegacy = /property=["']og:url["']/.test(html);
  if (hasLegacy && !opts.refresh) return { html, how: 'skipped' };

  const closeTitle = html.indexOf('</title>');
  if (closeTitle === -1) return { html, how: 'no-title' };
  const at = closeTitle + '</title>'.length;

  if (hasLegacy) {
    // Migrate: the old block ran from </title> to the end of its ld+json
    // script. Only replace when the span really is that block.
    const endTag = '</script>';
    const end = html.indexOf(endTag, at);
    const span = end === -1 ? '' : html.slice(at, end + endTag.length);
    if (end !== -1 && /og:url/.test(span) && /application\/ld\+json/.test(span)) {
      return { html: html.slice(0, at) + '\n' + wrapped + html.slice(end + endTag.length),
               how: 'migrated' };
    }
    return { html, how: 'skipped' };
  }

  return { html: html.slice(0, at) + '\n' + wrapped + html.slice(at), how: 'patched' };
}

/* ── back-fill hosted book pages ──────────────────────────────────────────
   These are book-forge output, not articles, so nothing here found them
   before: they carried no canonical, no og tags and no JSON-LD, and were
   absent from the sitemap. `bf build` overwrites them, so this must be
   re-runnable -- hence the markers. */
function patchBooks() {
  const report = { patched: [], updated: [], skipped: [], missing: [] };

  hostedBooks.forEach((b) => {
    const abs = path.join(ROOT, b.slug, 'index.html');
    if (!fs.existsSync(abs)) { report.missing.push(b.slug); return; }

    let html = fs.readFileSync(abs, 'utf8');
    const block = bookHeadBlock(b, {
      needsDescription: !/<meta\s+name=["']description["']/i.test(html),
    });
    const res = applyHead(html, block, { refresh: true });
    if (res.how === 'no-title') { report.missing.push(b.slug + ' (no <title>)'); return; }
    if (res.how === 'skipped') { report.skipped.push(b.slug); return; }

    if (!DRY) fs.writeFileSync(abs, res.html);
    (res.how === 'updated' || res.how === 'migrated'
      ? report.updated : report.patched).push(b.slug);
  });

  return report;
}

/* ── back-fill existing article pages ─────────────────────────────────── */
function patchArticles() {
  const report = { patched: [], updated: [], skipped: [], missing: [] };

  articles.forEach((a) => {
    const rel = path.join(a.slug, 'index.html');
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { report.missing.push(a.slug); return; }

    let html = fs.readFileSync(abs, 'utf8');
    const block = headBlock(a, {
      needsDescription: !/<meta\s+name=["']description["']/i.test(html),
    });
    const res = applyHead(html, block, { refresh: REFRESH });
    if (res.how === 'no-title') { report.missing.push(a.slug + ' (no <title>)'); return; }
    if (res.how === 'skipped') { report.skipped.push(a.slug); return; }

    if (!DRY) fs.writeFileSync(abs, res.html);
    (res.how === 'updated' || res.how === 'migrated'
      ? report.updated : report.patched).push(a.slug);
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

function report(label, r) {
  console.log(`\n${label}: ${r.patched.length} ${DRY ? 'to patch' : 'patched'}, ` +
              `${r.updated.length} updated, ${r.skipped.length} untouched, ` +
              `${r.missing.length} missing`);
  if (r.patched.length) console.log('  patched: ' + r.patched.join(', '));
  if (r.updated.length) console.log('  updated: ' + r.updated.join(', '));
  if (r.missing.length) console.log('  MISSING: ' + r.missing.join(', '));
}

report('books', patchBooks());
report('articles', patchArticles());
if (!REFRESH) {
  console.log('\n  (pages tagged before the SEO:HEAD markers are left alone;');
  console.log('   run with --refresh to migrate them onto the shared identity)');
}
