## Global Constraints

- **Branch:** continue on `site-uplift` (unmerged; folds into the in-flight work).
- **Runtime:** Node 18, zero npm dependencies; `build.js` stays CommonJS; tests run with `node --test`.
- **Commit identity:** `asadani <anuj.k.sadani@gmail.com>`; no `Co-Authored-By`; commit with `--no-verify`.
- **Colors via CSS variables only.** `site.css` is the HOMEPAGE stylesheet and is **light-only** (no `[data-theme="dark"]` block) — do not add dark rules to it. Venue colors: arXiv→`--red*`, SSRN→`--blue*`, Ko-fi/Amazon→`--accent*`.
- **No new dependencies.** Flip is CSS 3D transform + one delegated vanilla-JS listener.
- **Escaping:** `esc()` for text content (publication fields are plain text), `escAttr()` for attribute values. Literal `↗` glyph.
- **Accessibility:** the flip toggle is a real `<button>` with `aria-expanded`; `prefers-reduced-motion` must avoid the 3D rotate.
- **Do not touch** the article list, the equivalence gate, or any article page.

---

## Task 1: Add the SSRN paper + `dateDisplay` to `publications.json`

**Files:**
- Modify: `data/publications.json`
- Modify: `test/publications-data.test.js`

**Interfaces:**
- Produces: `papers[]` of length 3, each with a `dateDisplay` string; consumed by `renderFlipCard` (Task 2).

- [ ] **Step 1: Update the data-count test**

In `test/publications-data.test.js`, replace the existing `test('bucket counts: 1 book, 2 papers, 3 digital', …)` block with:

```js
test('bucket counts: 1 book, 3 papers, 3 digital', () => {
  assert.strictEqual(pubs.books.length, 1);
  assert.strictEqual(pubs.papers.length, 3);
  assert.strictEqual(pubs.digital.length, 3);
});

test('every paper has a dateDisplay string and the SSRN paper is present', () => {
  for(const p of pubs.papers){
    assert.ok(typeof p.dateDisplay === 'string' && p.dateDisplay.length > 0, `missing dateDisplay on ${p.id}`);
  }
  assert.ok(pubs.papers.some(p => /6071412/.test(p.url)), 'SSRN paper (6071412) missing');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/publications-data.test.js`
Expected: FAIL — papers length is 2, no `dateDisplay`.

- [ ] **Step 3: Edit `data/publications.json`**

Remove the top-level `"_note"` line. Replace the entire `"papers": [ … ]` array with this (adds `dateDisplay` to the two arXiv entries and appends the SSRN entry):

```json
  "papers": [
    {
      "badge": "arXiv",
      "cat": "cs.CL",
      "id": "arXiv:2605.13538",
      "title": "Locale-Conditioned Few-Shot Prompting Mitigates Demonstration Regurgitation in On-Device PII Substitution with Small Language Models",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-05-13",
      "dateDisplay": "May 13, 2026",
      "url": "https://arxiv.org/abs/2605.13538"
    },
    {
      "badge": "arXiv",
      "cat": "cs.AI",
      "id": "arXiv:2604.21816",
      "title": "Tool Attention Is All You Need: Dynamic Tool Gating and Lazy Schema Loading for Eliminating the MCP/Tools Tax in Scalable Agentic Workflows",
      "authors": [{ "name": "Anuj Sadani", "self": true }, { "name": "Deepak Kumar" }],
      "date": "2026-04-23",
      "dateDisplay": "April 23, 2026",
      "url": "https://arxiv.org/abs/2604.21816"
    },
    {
      "badge": "SSRN",
      "cat": "",
      "id": "SSRN:6071412",
      "title": "The Great Recalibration: The 2026 Pivot from Generalist Wrappers to Sovereign Application Layers and Industrialized Services",
      "authors": [{ "name": "Anuj Sadani", "self": true }],
      "date": "2026-01-01",
      "dateDisplay": "2026",
      "url": "https://dx.doi.org/10.2139/ssrn.6071412"
    }
  ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/publications-data.test.js`
Expected: PASS — 1 book / 3 papers / 3 digital, all papers have `dateDisplay`, SSRN present.
Run: `node -e "JSON.parse(require('fs').readFileSync('data/publications.json','utf8')); console.log('valid json')"`
Expected: `valid json`.

- [ ] **Step 5: Commit**

```bash
git add data/publications.json test/publications-data.test.js
git commit -m "Add SSRN paper + dateDisplay to publications.json (papers -> 3)" --no-verify
```

---

