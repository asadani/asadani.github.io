#!/usr/bin/env node
// Generates mac-ai-dev-setup/index.html from templates/mac-ai-dev-setup.template.html
// and the helper scripts in mac-ai-dev-setup/scripts/. The title, description and date come from
// the data/articles.json entry, so the page metadata and the catalog cannot drift apart.
//
//   node scripts/build-mac-setup.js          write mac-ai-dev-setup/index.html
//   node scripts/build-mac-setup.js --check  exit 1 if index.html is not up to date
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'mac-ai-dev-setup';
const DIR = path.join(ROOT, SLUG);
const OUT = path.join(DIR, 'index.html');

function build() {
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
  const entry = articles.find((a) => a.slug === SLUG);
  if (!entry) throw new Error(`data/articles.json has no entry for "${SLUG}". Add it first.`);

  const values = {
    TITLE: entry.title,
    SUBTITLE: 'Tick what you need, get the commands',
    DESCRIPTION: entry.desc,
    SLUG,
    ISO_DATE: entry.date,
    NAV_TOPIC: 'Setup guide',
    NAV_DATE: 'OCT 2026',
    EYEBROW: 'Interactive guide',
    DECK: 'Tick what your projects need. The page writes the commands in order, with a check after each one. Built from a real move to a new Apple Silicon Mac.',
    DATE: entry.dateDisplay.replace(/ \d{1,2}, /, ' '),
    META_DETAIL: 'macOS, Apple Silicon',
    FOOTER_DATE: entry.dateDisplay.replace(/ \d{1,2}, /, ' '),
  };

  let html = fs.readFileSync(path.join(ROOT, 'templates', `${SLUG}.template.html`), 'utf8');
  html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
    if (!(key in values)) throw new Error(`Unknown placeholder ${m} in the template`);
    return String(values[key]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  });

  const scripts = { SCAN: 'repo-needs.sh', SETUP: 'setup-repo.sh', LINK: 'link-skills.sh' };
  for (const [key, file] of Object.entries(scripts)) {
    const body = fs.readFileSync(path.join(DIR, 'scripts', file), 'utf8').trim();
    if (/<\/script|<!--/i.test(body)) throw new Error(`${file} contains markup that would break the embedded copy`);
    if (!html.includes(`@@${key}@@`)) throw new Error(`Template is missing the @@${key}@@ slot`);
    html = html.replace(`@@${key}@@`, () => body);
  }
  return html;
}

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== html) {
      console.error(`${SLUG}/index.html is out of date. Run: node scripts/build-mac-setup.js`);
      process.exit(1);
    }
    console.log(`${SLUG}/index.html is up to date`);
  } else {
    fs.writeFileSync(OUT, html);
    console.log(`wrote ${path.relative(ROOT, OUT)} (${html.length} bytes)`);
  }
}

module.exports = { build, SLUG };
