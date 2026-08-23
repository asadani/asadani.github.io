const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return esc(s).replace(/"/g,'&quot;'); }
function formatDate(iso){ const [y,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}, ${y}`; }

// topic slug -> row class / badge class / human label. Derived from the live
// homepage rows. The primary topic is tags[0]; extra tags are filter-only.
const TOPICS = {
  'ai-engineering': { row:'art-ai',          badge:'badge-ai',          label:'AI Engineering' },
  'security':       { row:'art-sec',         badge:'badge-sec',         label:'Security' },
  'infrastructure': { row:'art-infra',       badge:'badge-infra',       label:'Infrastructure' },
  'policy':         { row:'art-policy',      badge:'badge-policy',      label:'Policy' },
  'data':           { row:'art-data',        badge:'badge-data',        label:'Data' },
  'interactive':    { row:'art-interactive', badge:'badge-interactive', label:'Interactive' },
};

const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

// Article title/quote/desc are stored as raw HTML fragments (migrated verbatim
// from the existing homepage — they may contain <code>, &mdash;, &amp;, etc.),
// so they are emitted WITHOUT escaping. Data attributes and flavor names are
// plain text and ARE escaped. The share data-title only needs " escaped.
function renderArticleRow(a){
  const topic = a.tags[0];
  const t = TOPICS[topic];
  if(!t) throw new Error(`Unknown topic: ${topic}`);
  const flavorsAttr = a.flavors && a.flavors.length
    ? ` data-flavors="${escAttr(a.flavors.join(' '))}"` : '';
  const flavorsSpan = a.flavors && a.flavors.length
    ? `<span class="card-flavors">${a.flavors.map(f => `<span class="card-flavor">${esc(f)}</span>`).join('')}</span>`
    : '';
  const shareTitle = String(a.title).replace(/"/g,'&quot;');
  return `      <a class="art-row ${t.row}" href="/${a.slug}/" data-tags="${escAttr(a.tags.join(' '))}"${flavorsAttr}>
        <div class="art-strip"></div>
        <div class="art-body">
          <div class="art-top"><span class="art-badge ${t.badge}">${esc(t.label)}</span><span class="art-title">${a.title}</span>${flavorsSpan}</div>
          <div class="art-quote">${a.quote}</div>
          <div class="art-desc">${a.desc}</div>
        </div>
        <div class="art-meta">
          <span class="art-date">${a.dateDisplay}</span>
          <div class="art-actions">
            <button class="share-btn" aria-label="Share" data-url="${escAttr(a.shareUrl)}" data-title="${shareTitle}">
              ${SHARE_SVG}
            </button>
            <span class="art-link">${esc(a.cta)} →</span>
          </div>
        </div>
      </a>`;
}

// Stable sort by ISO date descending; equal dates keep input order.
function renderArticlesList(arts){
  return arts.slice().sort((x,y)=> String(y.date).localeCompare(String(x.date))).map(renderArticleRow).join('\n\n');
}

function venueFor(type, item){
  if(type === 'books')   return { key:'amazon', label:'Amazon' };
  if(type === 'digital') return { key:'kofi',   label:'Ko-fi' };
  return item.badge === 'SSRN' ? { key:'ssrn', label:'SSRN' } : { key:'arxiv', label:'arXiv' };
}

function venueLink(v, url){
  return `<a class="flipcard-link" href="${escAttr(url)}" target="_blank" rel="noopener">${esc(v.label)} ↗</a>`;
}

// Digital titles are sold on Ko-fi and are also readable free on this site.
// Where a hosted edition exists the card offers both, so the paid link reads
// as a way to support the work rather than the only way through.
function linkStrip(v, item, type){
  const paid = venueLink(v, item.url);
  if(type !== 'digital' || !item.hosted) return paid;
  const free = `<a class="flipcard-link flipcard-link--free" href="${escAttr(item.hosted)}">Read ↗</a>`;
  return `<div class="flipcard-linkrow">${free}${paid}</div>`;
}

function renderFlipCard(item, type){
  const v = venueFor(type, item);
  const isText = (type === 'papers');
  const variant = isText ? 'flipcard--text' : 'flipcard--media';

  let front;
  if(isText){
    const cat = item.cat ? `\n        <span class="flipcard-panel-cat">${esc(item.cat)}</span>` : '';
    front = `<span class="flipcard-panel-venue">${esc(v.label)}</span>
        <span class="flipcard-paneltitle">${esc(item.title)}</span>${cat}`;
  } else {
    const src = type === 'books' ? item.cover : item.image;
    front = `<img class="flipcard-cover" src="${escAttr(src)}" alt="${escAttr(item.title)} cover" loading="lazy" decoding="async">
        <span class="flipcard-caption">${esc(item.title)}</span>`;
  }

  let back;
  if(type === 'books'){
    back = `<span class="flipcard-desc">${esc(item.desc)}</span>
        <span class="flipcard-meta">${esc(item.meta)}</span>`;
  } else if(type === 'papers'){
    const authors = item.authors.map(a => a.self
      ? `<span class="pub-self">${esc(a.name)}</span>` : esc(a.name)).join(', ');
    back = `<span class="flipcard-meta">${authors}</span>
        <span class="flipcard-meta">${esc(item.dateDisplay)}</span>`;
  } else { // digital
    back = `<span class="flipcard-desc">${esc(item.desc)}</span>`;
  }

  const link = linkStrip(v, item, type);
  const t = escAttr(item.title);
  return `      <div class="flipcard venue-${v.key} ${variant}">
        <div class="flipcard-inner">
          <div class="flipcard-face flipcard-front">
            <button class="flipcard-toggle" type="button" aria-expanded="false" aria-label="Show details for ${t}">
        ${front}
            </button>
            ${link}
          </div>
          <div class="flipcard-face flipcard-back">
            <button class="flipcard-toggle" type="button" aria-expanded="false" aria-label="Hide details for ${t}">
        ${back}
            </button>
            ${link}
          </div>
        </div>
      </div>`;
}

const BUCKET_NOTES = {
  Digital: 'Sold on Ko-fi to support the work — and every one is also free to read in full on this site. Same book, same text.',
};

// The flavour bar used to be hand-maintained in the template, with a comment
// begging future edits to keep it in sync with the data. Generate it instead.
// Flavours carried by fewer than MIN_FLAVOR articles are left out: a chip that
// returns one or two rows advertises a dead end rather than a filter.
const MIN_FLAVOR = 3;

function renderFlavorBar(articles){
  const count = new Map();
  articles.forEach(a => (a.flavors || []).forEach(f =>
    count.set(f, (count.get(f) || 0) + 1)));
  const kept = [...count.entries()]
    .filter(([, n]) => n >= MIN_FLAVOR)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return kept.map(([f, n]) =>
    `        <button class="flavor-chip" data-flavor="${escAttr(f)}" `
    + `title="${n} article${n === 1 ? '' : 's'}">${esc(f)}</button>`).join('\n');
}

function renderPublications(pubs){
  const bucket = (label, items, type) =>
    `    <div class="pub-bucket-label">${esc(label)}</div>\n` +
    (BUCKET_NOTES[label] ? `    <p class="pub-bucket-note">${esc(BUCKET_NOTES[label])}</p>
` : '') +
    `    <div class="flip-grid">\n` +
    items.map(it => renderFlipCard(it, type)).join('\n') +
    `\n    </div>`;
  return [
    bucket('Books', pubs.books, 'books'),
    bucket('Papers', pubs.papers, 'papers'),
    bucket('Digital', pubs.digital, 'digital'),
  ].join('\n\n');
}

function renderPillars(c){
  const cards = [
    { label:'Writing', count:c.writing, meta:'essays & field notes', href:'#articles' },
    { label:'Papers', count:c.papers, meta:'arXiv / SSRN', href:'#research' },
    { label:'Books & Digital', count:c.booksDigital, meta:'books & Ko-fi', href:'#research' },
  ];
  return `<div class="pillars">\n` + cards.map(p =>
`      <a class="pillar-card" href="${p.href}">
        <span class="pillar-label">${esc(p.label)}</span>
        <span class="pillar-count">${p.count}</span>
        <span class="pillar-meta">${esc(p.meta)}</span>
        <span class="pillar-link">Browse &rarr;</span>
      </a>`).join('\n') + `\n    </div>`;
}

function injectBlocks(template, blocks){
  let out = template;
  for(const [key, html] of Object.entries(blocks)){
    const re = new RegExp(`<!-- BUILD:${key} -->[\\s\\S]*?<!-- /BUILD:${key} -->`);
    if(!re.test(out)) throw new Error(`Marker not found: BUILD:${key}`);
    // Function replacement so `$`-sequences (e.g. "$&", "$1", "$$") in rendered
    // content are inserted literally, not interpreted as replacement patterns.
    const replacement = `<!-- BUILD:${key} -->\n${html}\n<!-- /BUILD:${key} -->`;
    out = out.replace(re, () => replacement);
  }
  return out;
}

function build(){
  const articles = JSON.parse(fs.readFileSync(path.join(ROOT,'data/articles.json'),'utf8'));
  const pubs = JSON.parse(fs.readFileSync(path.join(ROOT,'data/publications.json'),'utf8'));
  const template = fs.readFileSync(path.join(ROOT,'templates/index.template.html'),'utf8');
  const counts = {
    writing: articles.length,
    papers: pubs.papers.length,
    booksDigital: pubs.books.length + pubs.digital.length,
  };
  const blocks = {
    publications: renderPublications(pubs),
    articles: renderArticlesList(articles),
    flavorbar: renderFlavorBar(articles),
  };
  // The pillars marker is added to the template in the landing rework (Task 6);
  // only inject it when present so the pipeline works before and after that change.
  if(/<!-- BUILD:pillars -->/.test(template)) blocks.pillars = renderPillars(counts);
  const out = injectBlocks(template, blocks);
  fs.writeFileSync(path.join(ROOT,'index.html'), out);
  return out;
}

if (require.main === module) build();

module.exports = { esc, escAttr, formatDate, TOPICS,
  renderArticleRow, renderArticlesList, renderFlavorBar, venueFor, venueLink, renderFlipCard,
  renderPublications, renderPillars, injectBlocks, build };
