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

function renderBookCard(b){
  return `    <a class="book-card" href="${escAttr(b.url)}" target="_blank" rel="noopener">
      <div class="book-strip"></div>
      <img class="book-cover" src="${escAttr(b.cover)}" alt="${escAttr(b.title)} book cover">
      <div class="book-body">
        <div class="book-title">${esc(b.title)}</div>
        <div class="book-sub">${esc(b.subtitle)} &middot; <span class="pub-self" style="color:var(--accent);font-weight:600">${esc(b.author)}</span></div>
        <div class="book-desc">${esc(b.desc)}</div>
        <div class="book-footer">
          <span class="book-meta">${esc(b.meta)}</span>
          <span class="book-cta">Buy on Amazon ↗</span>
        </div>
      </div>
    </a>`;
}

function renderPubCard(p){
  const cat = p.cat ? `\n          <span class="pub-cat">${esc(p.cat)}</span>` : '';
  const authors = p.authors.map(a => a.self
    ? `<span class="pub-self">${esc(a.name)}</span>` : esc(a.name)).join(', ');
  return `    <a class="pub-card" href="${escAttr(p.url)}" target="_blank" rel="noopener">
      <div class="pub-strip"></div>
      <div class="pub-body">
        <div class="pub-top">
          <span class="pub-badge">${esc(p.badge)}</span>${cat}
          <span class="pub-id">${esc(p.id)}</span>
        </div>
        <div class="pub-title">${esc(p.title)}</div>
        <div class="pub-authors">${authors}</div>
        <div class="pub-footer">
          <span class="pub-date">${formatDate(p.date)}</span>
          <span class="pub-link">Read on ${esc(p.badge)} ↗</span>
        </div>
      </div>
    </a>`;
}

function renderStoreCard(d){
  return `    <a class="store-card" href="${escAttr(d.url)}" target="_blank" rel="noopener">
      <div class="store-strip"></div>
      <img class="store-cover" src="${escAttr(d.image)}" alt="${escAttr(d.title)} cover">
      <div class="store-body">
        <span class="store-badge">Ko-fi</span>
        <div class="store-title">${esc(d.title)}</div>
        <div class="store-desc">${esc(d.desc)}</div>
        <div class="store-footer">
          <span class="store-cta">View on Ko-fi ↗</span>
        </div>
      </div>
    </a>`;
}

function renderPublications(pubs){
  const bucket = (label, items, fn) =>
    `    <div class="pub-bucket-label">${esc(label)}</div>\n` + items.map(fn).join('\n');
  return [
    bucket('Books', pubs.books, renderBookCard),
    bucket('Papers', pubs.papers, renderPubCard),
    bucket('Digital', pubs.digital, renderStoreCard),
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
    out = out.replace(re, `<!-- BUILD:${key} -->\n${html}\n<!-- /BUILD:${key} -->`);
  }
  return out;
}

module.exports = { esc, escAttr, formatDate, TOPICS,
  renderArticleRow, renderArticlesList, renderBookCard, renderPubCard,
  renderStoreCard, renderPublications, renderPillars, injectBlocks };
