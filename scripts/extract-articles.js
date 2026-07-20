// One-shot migration: parse the existing homepage .art-row blocks into
// data/articles.json verbatim. Run once against the pre-build index.html.
//   node scripts/extract-articles.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const MON3 = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

function parseISO(display){
  // "June 18, 2026" | "Apr 7, 2026" | "Apr 2026" | "Mar 24, 2026"
  const m = display.match(/^([A-Za-z]+)\s+(?:(\d{1,2}),\s*)?(\d{4})$/);
  if(!m) throw new Error(`Unparseable date: "${display}"`);
  const mon = MON3[display.slice(0,3).toLowerCase()];
  if(!mon) throw new Error(`Unknown month: "${display}"`);
  const day = m[2] ? m[2].padStart(2,'0') : '15'; // no-day entries: stable mid-month
  return `${m[3]}-${String(mon).padStart(2,'0')}-${day}`;
}

const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const listStart = html.indexOf('<div class="articles-list">');
const listEnd = html.indexOf('<div class="pagination"', listStart);
const region = html.slice(listStart, listEnd);

const rowRe = /<a class="art-row[\s\S]*?<\/a>/g;
const grab = (block, re) => { const m = block.match(re); return m ? m[1] : null; };

const articles = [];
let m;
while((m = rowRe.exec(region))){
  const block = m[0];
  const slug = grab(block, /href="\/([^"]+?)\/"/);
  const tags = grab(block, /data-tags="([^"]*)"/).split(/\s+/).filter(Boolean);
  const flavorsRaw = grab(block, /data-flavors="([^"]*)"/);
  const flavors = flavorsRaw ? flavorsRaw.split(/\s+/).filter(Boolean) : [];
  const title = grab(block, /<span class="art-title">([\s\S]*?)<\/span>/);
  const quote = grab(block, /<div class="art-quote">([\s\S]*?)<\/div>/);
  const desc  = grab(block, /<div class="art-desc">([\s\S]*?)<\/div>/);
  const dateDisplay = grab(block, /<span class="art-date">([\s\S]*?)<\/span>/);
  const ctaRaw = grab(block, /<span class="art-link">([\s\S]*?)<\/span>/);
  const cta = ctaRaw.replace(/\s*(&rarr;|→)\s*$/,'').trim();
  const shareUrl = grab(block, /data-url="([^"]*)"/) || `https://tech.anujsadani.in/${slug}/`;
  articles.push({ slug, title, tags, flavors, quote, desc, date: parseISO(dateDisplay), dateDisplay, cta, shareUrl });
}

fs.writeFileSync(path.join(ROOT,'data/articles.json'), JSON.stringify(articles, null, 2) + '\n');
console.log(`Wrote ${articles.length} articles to data/articles.json`);
