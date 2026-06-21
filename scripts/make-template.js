// One-shot: derive templates/index.template.html from the current index.html.
// (1) inline <style> -> <link site.css>; (2) #research cards -> publications marker;
// (3) .articles-list inner -> articles marker. Run once.  node scripts/make-template.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error('make-template: ' + msg); };

// (1) Replace the inline <head> stylesheet with a link to the shared sheet.
const styleRe = /<style>[\s\S]*?<\/style>/;
must(styleRe.test(html), 'no <style> block found');
html = html.replace(styleRe, '<link rel="stylesheet" href="/assets/site.css">');

// (2) Replace the Publications cards with a marker, keeping heading + section close.
const pubHeading = '<div class="section-heading">Publications</div>';
const pubAt = html.indexOf(pubHeading);
must(pubAt !== -1, 'Publications heading not found');
const artComment = html.indexOf('<!-- ── ARTICLES', pubAt);
must(artComment !== -1, 'ARTICLES comment not found');
const sectionClose = html.lastIndexOf('</div>', artComment); // closes #research
must(sectionClose > pubAt, 'research section close not found');
html = html.slice(0, pubAt + pubHeading.length)
     + '\n\n    <!-- BUILD:publications --><!-- /BUILD:publications -->\n  '
     + html.slice(sectionClose);

// (3) Replace the .articles-list inner rows with a marker.
const listOpen = '<div class="articles-list">';
const listAt = html.indexOf(listOpen);
must(listAt !== -1, 'articles-list not found');
const listInnerStart = listAt + listOpen.length;
const listClose = html.indexOf('\n    </div>\n\n    <div class="pagination"', listInnerStart);
must(listClose !== -1, 'articles-list close not found');
html = html.slice(0, listInnerStart)
     + '\n\n      <!-- BUILD:articles --><!-- /BUILD:articles -->\n\n    '
     + html.slice(listClose + '\n    '.length);

fs.writeFileSync(path.join(ROOT, 'templates/index.template.html'), html);
console.log('wrote templates/index.template.html');
