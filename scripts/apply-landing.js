// One-shot: apply Direction-A landing to templates/index.template.html.
// (1) pillars marker into hero; (2) reorder nav; (3) reorder sections to
// hero -> Articles -> Research -> About(Journey, Tech, Interests). Run once.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'templates/index.template.html');

let html = fs.readFileSync(FILE, 'utf8');
const must = (c, m) => { if (!c) throw new Error('apply-landing: ' + m); };

// --- (2) Reorder nav links to follow the new page order ---
const navOld = `    <a class="nav-link" href="#journey">Journey</a>
    <a class="nav-link" href="#tech">Tech</a>
    <a class="nav-link" href="#research">Research</a>
    <a class="nav-link" href="#articles">Articles</a>
    <a class="nav-link" href="#interests">Interests</a>`;
const navNew = `    <a class="nav-link" href="#articles">Articles</a>
    <a class="nav-link" href="#research">Research</a>
    <a class="nav-link" href="#journey">Journey</a>
    <a class="nav-link" href="#tech">Tech</a>
    <a class="nav-link" href="#interests">Interests</a>`;
must(html.includes(navOld), 'nav links block not found');
html = html.replace(navOld, navNew);

// --- Slice the section blocks by their banner comments ---
const M = {
  hero:      '<!-- ── HERO',
  journey:   '<!-- ── JOURNEY',
  tech:      '<!-- ── TECH STACK',
  research:  '<!-- ── RESEARCH',
  articles:  '<!-- ── ARTICLES',
  interests: '<!-- ── INTERESTS',
};
const at = {};
for (const [k, v] of Object.entries(M)) { at[k] = html.indexOf(v); must(at[k] !== -1, `${k} marker missing`); }
const footerAt = html.indexOf('<footer');
must(footerAt !== -1, 'footer not found');

const prefix = html.slice(0, at.hero);
let hero      = html.slice(at.hero, at.journey);
const journey = html.slice(at.journey, at.tech);
const tech    = html.slice(at.tech, at.research);
const research= html.slice(at.research, at.articles);
const articles= html.slice(at.articles, at.interests);
const interests = html.slice(at.interests, footerAt);
const suffix  = html.slice(footerAt);

// --- (1) Insert the pillars marker into the hero, before its </section> ---
const heroClose = hero.lastIndexOf('</section>');
must(heroClose !== -1, 'hero </section> not found');
hero = hero.slice(0, heroClose)
     + '  <!-- BUILD:pillars --><!-- /BUILD:pillars -->\n  '
     + hero.slice(heroClose);

// --- (3) Reassemble: hero -> Articles -> Research -> About(journey,tech,interests) ---
const aboutLead =
`  <!-- ── ABOUT ──────────────────────────────────────────────── -->
  <div class="section-anchor" id="about">
    <div class="section-label">About</div>
    <div class="section-heading">About Anuj</div>
  </div>

`;
html = prefix + hero + articles + research + aboutLead + journey + tech + interests + suffix;

fs.writeFileSync(FILE, html);
console.log('applied Direction-A landing');
