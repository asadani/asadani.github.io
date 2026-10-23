const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { build, SLUG } = require('../scripts/build-mac-setup.js');
const M = require('../mac-ai-dev-setup/steps.js');

const root = path.join(__dirname, '..');
const dir = path.join(root, SLUG);
const SCRIPTS = { scan: 'repo-needs.sh', setup: 'setup-repo.sh', link: 'link-skills.sh' };
const SCR = Object.fromEntries(Object.entries(SCRIPTS).map(([k, f]) => [k, fs.readFileSync(path.join(dir, 'scripts', f), 'utf8').trim()]));
const arts = JSON.parse(fs.readFileSync(path.join(root, 'data/articles.json'), 'utf8'));
const entry = arts.find((a) => a.slug === SLUG);

const everything = () => {
  const sel = {};
  M.PRESETS.find((p) => p.n === 'Everything').s.forEach((id) => { sel[id] = true; });
  return sel;
};
const FILLED = { owner: 'octocat', gitName: 'Test User', gitEmail: 't@example.com', vault: '~/Memory/test-brain', pattern: '^a' };
const hasShell = (name) => spawnSync('sh', ['-c', `command -v ${name}`]).status === 0;
const syntaxOk = (shell, text) => spawnSync(shell, ['-n'], { input: text, encoding: 'utf8' });
// A step may embed a whole helper script in a heredoc. Drop heredoc bodies so line checks only see the step's own commands.
const withoutHeredocs = (text) => text.replace(/<<-?['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\1(?=\n|$)/g, '');

test('catalog entry exists with the fields the homepage needs', () => {
  assert.ok(entry, 'data/articles.json must list mac-ai-dev-setup');
  assert.ok(['tutorial', 'interactive'].includes(entry.tags[0]));
  assert.strictEqual(entry.shareUrl, 'https://tech.anujsadani.in/mac-ai-dev-setup/');
});

test('index.html is generated from the template and the scripts (run node scripts/build-mac-setup.js)', () => {
  assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), build());
});

test('page carries the site chrome and complete metadata', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /<a class="nav-brand" href="\/">/);
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /localStorage\.getItem\('theme'\)/);
  assert.match(html, /<link rel="canonical" href="https:\/\/tech\.anujsadani\.in\/mac-ai-dev-setup\/">/);
  assert.match(html, /<link rel="stylesheet" href="\/assets\/article\.css">/);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html.replace(/<script type="text\/plain"[\s\S]*?<\/script>/g, '')), 'unresolved {{PLACEHOLDER}}');
  assert.ok(html.includes(`<meta name="description" content="${entry.desc}">`), 'description must match the catalog');
  assert.ok(!html.includes('—'), 'the site style avoids em dashes');
});

test('embedded helper scripts match the files in scripts/', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  for (const [id, file] of [['tpl-scan', SCRIPTS.scan], ['tpl-setup', SCRIPTS.setup], ['tpl-link', SCRIPTS.link]]) {
    const m = html.match(new RegExp(`<script type="text/plain" id="${id}">([\\s\\S]*?)</script>`));
    assert.ok(m, `missing embedded ${id}`);
    assert.strictEqual(m[1].trim(), fs.readFileSync(path.join(dir, 'scripts', file), 'utf8').trim(), `${file} drifted from its embedded copy`);
  }
});

test('helper scripts parse under bash', () => {
  for (const f of Object.values(SCRIPTS)) {
    const r = syntaxOk('bash', fs.readFileSync(path.join(dir, 'scripts', f), 'utf8'));
    assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('every tool resolves to a plan on its own, and dependencies are pulled in', () => {
  for (const t of M.TOOLS) {
    const p = M.plan({ sel: { [t.id]: true }, vals: {} }, SCR);
    assert.ok(p.steps.length >= 4, `${t.id}: always-on steps missing`);
    for (const need of t.needs || []) assert.ok(p.R.on[need], `${t.id} should pull in ${need}`);
  }
});

test('the Everything plan renders every step with commands, a reason and a check', () => {
  const { steps } = M.plan({ sel: everything(), vals: FILLED }, SCR);
  assert.ok(steps.length >= 26, `expected the full plan, got ${steps.length} steps`);
  assert.strictEqual(new Set(steps.map((s) => s.id)).size, steps.length, 'duplicate step ids');
  for (const s of steps) {
    assert.ok(s.title && s.why && s.cmds, `${s.id}: title, why and cmds are required`);
    assert.ok(Array.isArray(s.badges) && s.badges.length, `${s.id}: needs at least one honesty badge`);
    assert.ok(s.verify, `${s.id}: needs a check-it-worked block`);
  }
});

test('every generated command block parses under bash (and zsh when installed)', () => {
  const { steps } = M.plan({ sel: everything(), vals: FILLED }, SCR);
  const shells = ['bash', ...(hasShell('zsh') ? ['zsh'] : [])];
  for (const s of steps) for (const [kind, text] of [['run', s.cmds], ['verify', s.verify]]) for (const sh of shells) {
    const r = syntaxOk(sh, text);
    assert.strictEqual(r.status, 0, `${s.id} (${kind}) fails ${sh} -n: ${r.stderr}`);
  }
});

test('steps are safe to re-run: file writes are guarded, nothing closes the terminal', () => {
  const { steps } = M.plan({ sel: everything(), vals: FILLED }, SCR);
  for (const s of steps) {
    for (const line of withoutHeredocs(s.cmds).split('\n')) {
      if (/\bexit\b/.test(line.replace(/'[^']*'|"[^"]*"/g, ''))) assert.fail(`${s.id}: "exit" would close the reader's terminal: ${line}`);
    }
    for (const line of s.cmds.split('\n')) {
      if (/\bcat >> /.test(line)) assert.ok(/grep -q/.test(line), `${s.id}: append must be guarded by grep -q: ${line}`);
      else if (/\bcat > /.test(line) && !line.includes('.mac-ai-setup/')) assert.ok(/\[ -f /.test(line), `${s.id}: write must be guarded by [ -f ]: ${line}`);
    }
  }
});

test('typed values cannot break out of the generated commands', () => {
  const hostile = { owner: 'x"; touch /tmp/pwned; "', gitName: 'Bob "$(touch /tmp/pwned)" `id`', gitEmail: 'b@e.com', dir: '~/a b"; rm -rf ~; "', vault: '~/v"; touch /tmp/pwned; "', pattern: 'a"; touch /tmp/pwned; "', theme: 'frisk"; touch /tmp/pwned; "' };
  const { steps } = M.plan({ sel: everything(), vals: hostile }, SCR);
  const text = steps.map((s) => s.cmds).join('\n');
  assert.ok(!/OWNER="x"/.test(text), 'a bad GitHub owner must fall back to the placeholder');
  assert.ok(text.includes('OWNER="your-github-name"'));
  assert.ok(text.includes('user.name "Bob \\"\\$(touch /tmp/pwned)\\" \\`id\\`"'), 'git name must be escaped');
  for (const s of steps) {
    for (const sh of ['bash', ...(hasShell('zsh') ? ['zsh'] : [])]) {
      const r = syntaxOk(sh, s.cmds);
      assert.strictEqual(r.status, 0, `${s.id} breaks ${sh} with hostile input: ${r.stderr}`);
    }
  }
});

test('the scanner runs on a small tree and reports the tools it finds', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'scan-'));
  const repo = path.join(tmp, 'owner', 'demo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"demo"}');
  fs.writeFileSync(path.join(repo, 'pnpm-lock.yaml'), '');
  fs.writeFileSync(path.join(repo, 'pyproject.toml'), '[project]\nrequires-python = ">=3.11"\n');
  fs.writeFileSync(path.join(repo, 'Dockerfile'), 'FROM scratch\n');
  const r = spawnSync('bash', [path.join(dir, 'scripts', 'repo-needs.sh'), tmp], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /owner\/demo\s+pnpm python\(>=3\.11\) docker/);
  assert.match(r.stdout, /^\s+pnpm\s+1 repo\(s\)$/m);
  assert.match(r.stdout, /brew install --cask docker/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
