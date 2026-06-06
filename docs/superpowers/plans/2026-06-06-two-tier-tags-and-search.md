# Two-Tier Tags + Client-Side Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second tier of cross-cutting "flavor" tags plus a client-side search box to the homepage article listing, so readers can slice within/across the broad category pills.

**Architecture:** Pure additions to the single static file `index.html` — new `data-flavors` attributes on each `.art-row`, display-only flavor chips in each card, a search `<input>` and a flavor-chip bar above the list, and three AND-combined filter predicates (category, flavor, search) wired into the existing pagination IIFE. No backend, no build step, no new pages. All new CSS uses existing theme variables so light + dark both work.

**Tech Stack:** Hand-rolled HTML + inline `<style>` + vanilla JS in `index.html`. No test runner exists in this repo; verification is grep-based assertions on the markup plus manual browser checks for interaction.

**Reference spec:** `docs/superpowers/specs/2026-06-06-two-tier-tags-and-search-design.md`

**Note on line numbers:** All line numbers below are as of the spec date. After each edit the file shifts; locate anchors by their unique text (shown in every step) rather than trusting absolute line numbers.

---

## File Structure

- **Modify:** `index.html`
  - `<style>` block (~line 253): add `.article-search`, `.filter-row`, `.filter-lead`, `.flavor-bar`, `.flavor-chip`, `.card-flavors`, `.card-flavor`; set `.filter-bar` margin-bottom to 0.
  - Markup ~line 825: add search input + restructure category bar into a `.filter-row` + add a flavor `.filter-row`.
  - Each of the 19 `.art-row` blocks (lines 837–1164): add `data-flavors="…"` to the `<a>` and a `.card-flavors` span into `.art-top` (17 rows get flavors; 2 rows get none).
  - JS IIFE (~lines 1303–1365): add `currentFlavor` + `currentSearch` state, three matcher functions, flavor-chip + search listeners.
  - HTML comment above `.articles-list` documenting the vocabulary.
- **Modify:** `CLAUDE.md` — one line documenting the `data-flavors` convention.

---

## Task 1: Add CSS for search box, flavor bar, and card chips

**Files:**
- Modify: `index.html` (style block, near `.filter-pill.active` ~line 253 and `.filter-bar` ~line 250)

- [ ] **Step 1: Set `.filter-bar` margin to 0 so the new `.filter-row` controls spacing**

Find this exact line (~250):

```css
  .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
```

Replace with:

```css
  .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0; }
```

- [ ] **Step 2: Add the new rules immediately after the `.filter-pill.active` line**

Find this exact line (~253):

```css
  .filter-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
```

Insert the following block on the line directly after it:

```css
  /* search box */
  .article-search { width: 100%; box-sizing: border-box; font-family: var(--sans); font-size: 13px; padding: 9px 14px; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text-body); transition: border-color 0.15s; }
  .article-search::placeholder { color: var(--text-subtle); }
  .article-search:focus { outline: none; border-color: var(--accent); }
  /* two-row filter layout (category + flavor) */
  .filter-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .filter-lead { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-subtle); flex-shrink: 0; width: 56px; padding-top: 4px; }
  .filter-row:last-of-type { margin-bottom: 24px; }
  /* flavor chips (interactive filter) */
  .flavor-bar { display: flex; flex-wrap: wrap; gap: 6px; }
  .flavor-chip { font-family: var(--mono); font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
  .flavor-chip::before { content: "#"; opacity: 0.55; }
  .flavor-chip:hover { border-color: var(--accent); color: var(--accent); }
  .flavor-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  /* flavor chips shown on each article card (display-only) */
  .card-flavors { display: inline-flex; flex-wrap: wrap; gap: 5px; }
  .card-flavor { font-family: var(--mono); font-size: 9px; padding: 1px 6px; border-radius: 3px; border: 1px solid var(--border); color: var(--text-subtle); white-space: nowrap; }
  .card-flavor::before { content: "#"; opacity: 0.5; }
```

- [ ] **Step 3: Verify the rules were added and use only variables (no stray hardcoded mode-colors)**

Run: `grep -c 'flavor-chip\|article-search\|card-flavor\|filter-row\|filter-lead' index.html`
Expected: a count of 15 or more.

Run: `grep -n 'article-search\|flavor-chip\|card-flavor' index.html | grep -iE '#[0-9a-f]{3,6}' | grep -v 'color: #fff'`
Expected: **no output** (the only allowed hardcoded color is `#fff` on `.flavor-chip.active`, matching the existing `.filter-pill.active`).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add CSS for tag search box, flavor bar, and card chips"
```

---

## Task 2: Add `data-flavors` attribute + card chips to every article row

Each article row is edited once: add `data-flavors="…"` to the opening `<a class="art-row …">` tag, and insert a `.card-flavors` span at the end of its `.art-top` div (after the `.art-title` span). Use the assignment table below. Two rows (`data-product-manifesto`, `amazon-s3-files`) get **neither** a `data-flavors` attribute nor a chips span.

**Assignment table:**

| art-row href | data-flavors | card chips |
|---|---|---|
| `/from-todo-to-toknow/` | `craft agentic-coding` | craft, agentic-coding |
| `/spec-lies-until-something-runs-it/` | `prompting evals craft` | prompting, evals, craft |
| `/synthid-watermark-check/` | `provenance` | provenance |
| `/agentic-ocr-for-real/` | `agents` | agents |
| `/self-improving-ai-honestly/` | `agents research` | agents, research |
| `/gemini-3-5-flash-agent-first/` | `models cost-latency` | models, cost-latency |
| `/moral-surrender/` | `agents craft` | agents, craft |
| `/contextual-retrieval-tradeoffs/` | `rag` | rag |
| `/automated-prompt-optimization/` | `prompting evals` | prompting, evals |
| `/deepseek-v4-real-leap/` | `models` | models |
| `/mcp-supply-chain-rce/` | `supply-chain` | supply-chain |
| `/data-product-manifesto/` | *(none)* | *(none)* |
| `/ai-coding-agent-stack/` | `agentic-coding` | agentic-coding |
| `/ai-agent-stack-map/` | `agentic-coding` | agentic-coding |
| `/ai-shrinkflation/` | `models evals` | models, evals |
| `/gemini-flex-inference/` | `cost-latency` | cost-latency |
| `/linux-ai-ownership/` | `provenance` | provenance |
| `/amazon-s3-files/` | *(none)* | *(none)* |
| `/litellm-supply-chain-attack/` | `supply-chain` | supply-chain |

**Files:**
- Modify: `index.html` (17 art-row blocks)

The edit pattern for each row has two parts. **Part A** — add the attribute to the `<a>` tag. The current tag looks like:

```html
      <a class="art-row art-ai" href="/SLUG/" data-tags="ai-engineering">
```

becomes (insert ` data-flavors="…"` right before the closing `>`):

```html
      <a class="art-row art-ai" href="/SLUG/" data-tags="ai-engineering" data-flavors="FLAVORS">
```

**Part B** — add the chips span inside `.art-top`, after the title span. The current `.art-top` looks like:

```html
          <div class="art-top"><span class="art-badge badge-ai">AI Engineering</span><span class="art-title">TITLE</span></div>
```

becomes:

```html
          <div class="art-top"><span class="art-badge badge-ai">AI Engineering</span><span class="art-title">TITLE</span><span class="card-flavors"><span class="card-flavor">flavor1</span><span class="card-flavor">flavor2</span></span></div>
```

Below, each step gives the exact unique anchor text and the exact replacement so the edits are unambiguous. Do them one row at a time.

- [ ] **Step 1: `from-todo-to-toknow` — add attribute**

Find: `<a class="art-row art-ai" href="/from-todo-to-toknow/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/from-todo-to-toknow/" data-tags="ai-engineering" data-flavors="craft agentic-coding">`

- [ ] **Step 2: `from-todo-to-toknow` — add card chips**

Find: `<span class="art-title">From TODO to TOKNOW</span></div>`
Replace: `<span class="art-title">From TODO to TOKNOW</span><span class="card-flavors"><span class="card-flavor">craft</span><span class="card-flavor">agentic-coding</span></span></div>`

- [ ] **Step 3: `spec-lies-until-something-runs-it` — attribute**

Find: `<a class="art-row art-ai" href="/spec-lies-until-something-runs-it/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/spec-lies-until-something-runs-it/" data-tags="ai-engineering" data-flavors="prompting evals craft">`

- [ ] **Step 4: `spec-lies-until-something-runs-it` — card chips**

Find: `<span class="art-title">The spec lies until something runs it</span></div>`
Replace: `<span class="art-title">The spec lies until something runs it</span><span class="card-flavors"><span class="card-flavor">prompting</span><span class="card-flavor">evals</span><span class="card-flavor">craft</span></span></div>`

- [ ] **Step 5: `synthid-watermark-check` — attribute**

Find: `<a class="art-row art-ai" href="/synthid-watermark-check/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/synthid-watermark-check/" data-tags="ai-engineering" data-flavors="provenance">`

- [ ] **Step 6: `synthid-watermark-check` — card chips**

Find: `<span class="art-title">SynthID can't tell you who made it.</span></div>`
Replace: `<span class="art-title">SynthID can't tell you who made it.</span><span class="card-flavors"><span class="card-flavor">provenance</span></span></div>`

- [ ] **Step 7: `agentic-ocr-for-real` — attribute**

Find: `<a class="art-row art-ai" href="/agentic-ocr-for-real/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/agentic-ocr-for-real/" data-tags="ai-engineering" data-flavors="agents">`

- [ ] **Step 8: `agentic-ocr-for-real` — card chips**

Find: `<span class="art-title">What is "agentic OCR," really?</span></div>`
Replace: `<span class="art-title">What is "agentic OCR," really?</span><span class="card-flavors"><span class="card-flavor">agents</span></span></div>`

- [ ] **Step 9: `self-improving-ai-honestly` — attribute**

Find: `<a class="art-row art-ai" href="/self-improving-ai-honestly/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/self-improving-ai-honestly/" data-tags="ai-engineering" data-flavors="agents research">`

- [ ] **Step 10: `self-improving-ai-honestly` — card chips**

Find: `<span class="art-title">Self-Improving AI, Honestly</span></div>`
Replace: `<span class="art-title">Self-Improving AI, Honestly</span><span class="card-flavors"><span class="card-flavor">agents</span><span class="card-flavor">research</span></span></div>`

- [ ] **Step 11: `gemini-3-5-flash-agent-first` — attribute**

Find: `<a class="art-row art-ai" href="/gemini-3-5-flash-agent-first/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/gemini-3-5-flash-agent-first/" data-tags="ai-engineering" data-flavors="models cost-latency">`

- [ ] **Step 12: `gemini-3-5-flash-agent-first` — card chips**

Find: `<span class="art-title">Google is quietly changing what "Flash" means</span></div>`
Replace: `<span class="art-title">Google is quietly changing what "Flash" means</span><span class="card-flavors"><span class="card-flavor">models</span><span class="card-flavor">cost-latency</span></span></div>`

- [ ] **Step 13: `moral-surrender` — attribute**

Find: `<a class="art-row art-ai" href="/moral-surrender/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/moral-surrender/" data-tags="ai-engineering" data-flavors="agents craft">`

- [ ] **Step 14: `moral-surrender` — card chips**

Find: `<span class="art-title">Moral Surrender</span></div>`
Replace: `<span class="art-title">Moral Surrender</span><span class="card-flavors"><span class="card-flavor">agents</span><span class="card-flavor">craft</span></span></div>`

- [ ] **Step 15: `contextual-retrieval-tradeoffs` — attribute**

Find: `<a class="art-row art-ai" href="/contextual-retrieval-tradeoffs/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/contextual-retrieval-tradeoffs/" data-tags="ai-engineering" data-flavors="rag">`

- [ ] **Step 16: `contextual-retrieval-tradeoffs` — card chips**

Find: `<span class="art-title">Contextual retrieval, honestly</span></div>`
Replace: `<span class="art-title">Contextual retrieval, honestly</span><span class="card-flavors"><span class="card-flavor">rag</span></span></div>`

- [ ] **Step 17: `automated-prompt-optimization` — attribute**

Find: `<a class="art-row art-ai" href="/automated-prompt-optimization/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/automated-prompt-optimization/" data-tags="ai-engineering" data-flavors="prompting evals">`

- [ ] **Step 18: `automated-prompt-optimization` — card chips**

Find: `<span class="art-title">Automated prompt optimization, in 2026</span></div>`
Replace: `<span class="art-title">Automated prompt optimization, in 2026</span><span class="card-flavors"><span class="card-flavor">prompting</span><span class="card-flavor">evals</span></span></div>`

- [ ] **Step 19: `deepseek-v4-real-leap` — attribute**

Find: `<a class="art-row art-ai" href="/deepseek-v4-real-leap/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/deepseek-v4-real-leap/" data-tags="ai-engineering" data-flavors="models">`

- [ ] **Step 20: `deepseek-v4-real-leap` — card chips**

Find: `<span class="art-title">The Complaints Are Valid. The Leap Is Real.</span></div>`
Replace: `<span class="art-title">The Complaints Are Valid. The Leap Is Real.</span><span class="card-flavors"><span class="card-flavor">models</span></span></div>`

- [ ] **Step 21: `mcp-supply-chain-rce` — attribute**

Find: `<a class="art-row art-sec" href="/mcp-supply-chain-rce/" data-tags="security">`
Replace: `<a class="art-row art-sec" href="/mcp-supply-chain-rce/" data-tags="security" data-flavors="supply-chain">`

- [ ] **Step 22: `mcp-supply-chain-rce` — card chips**

Find: `<span class="art-title">The Mother of All AI Supply Chains: MCP's By-Design RCE</span></div>`
Replace: `<span class="art-title">The Mother of All AI Supply Chains: MCP's By-Design RCE</span><span class="card-flavors"><span class="card-flavor">supply-chain</span></span></div>`

- [ ] **Step 23: `ai-coding-agent-stack` — attribute**

Find: `<a class="art-row art-ai" href="/ai-coding-agent-stack/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/ai-coding-agent-stack/" data-tags="ai-engineering" data-flavors="agentic-coding">`

- [ ] **Step 24: `ai-coding-agent-stack` — card chips**

Find: `<span class="art-title">The Five Layers of the Modern AI Coding Agent Stack</span></div>`
Replace: `<span class="art-title">The Five Layers of the Modern AI Coding Agent Stack</span><span class="card-flavors"><span class="card-flavor">agentic-coding</span></span></div>`

- [ ] **Step 25: `ai-agent-stack-map` — attribute**

Find: `<a class="art-row art-interactive" href="/ai-agent-stack-map/" data-tags="interactive ai-engineering">`
Replace: `<a class="art-row art-interactive" href="/ai-agent-stack-map/" data-tags="interactive ai-engineering" data-flavors="agentic-coding">`

- [ ] **Step 26: `ai-agent-stack-map` — card chips**

Find: `<span class="art-title">AI Coding Agent Stack — Interactive Mind Map</span></div>`
Replace: `<span class="art-title">AI Coding Agent Stack — Interactive Mind Map</span><span class="card-flavors"><span class="card-flavor">agentic-coding</span></span></div>`

- [ ] **Step 27: `ai-shrinkflation` — attribute**

Find: `<a class="art-row art-ai" href="/ai-shrinkflation/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/ai-shrinkflation/" data-tags="ai-engineering" data-flavors="models evals">`

- [ ] **Step 28: `ai-shrinkflation` — card chips**

Find: `<span class="art-title">AI Shrinkflation: The Silent Regression Your Team Won't See Coming</span></div>`
Replace: `<span class="art-title">AI Shrinkflation: The Silent Regression Your Team Won't See Coming</span><span class="card-flavors"><span class="card-flavor">models</span><span class="card-flavor">evals</span></span></div>`

- [ ] **Step 29: `gemini-flex-inference` — attribute**

Find: `<a class="art-row art-ai" href="/gemini-flex-inference/" data-tags="ai-engineering">`
Replace: `<a class="art-row art-ai" href="/gemini-flex-inference/" data-tags="ai-engineering" data-flavors="cost-latency">`

- [ ] **Step 30: `gemini-flex-inference` — card chips**

Find: `<span class="art-title">Flex &amp; Priority: One Line of Code</span></div>`
Replace: `<span class="art-title">Flex &amp; Priority: One Line of Code</span><span class="card-flavors"><span class="card-flavor">cost-latency</span></span></div>`

- [ ] **Step 31: `linux-ai-ownership` — attribute**

Find: `<a class="art-row art-policy" href="/linux-ai-ownership/" data-tags="policy">`
Replace: `<a class="art-row art-policy" href="/linux-ai-ownership/" data-tags="policy" data-flavors="provenance">`

- [ ] **Step 32: `linux-ai-ownership` — card chips**

Find: `<span class="art-title">AI Writes the Code. You Own Everything.</span></div>`
Replace: `<span class="art-title">AI Writes the Code. You Own Everything.</span><span class="card-flavors"><span class="card-flavor">provenance</span></span></div>`

- [ ] **Step 33: `litellm-supply-chain-attack` — attribute**

Find: `<a class="art-row art-sec" href="/litellm-supply-chain-attack/" data-tags="security">`
Replace: `<a class="art-row art-sec" href="/litellm-supply-chain-attack/" data-tags="security" data-flavors="supply-chain">`

- [ ] **Step 34: `litellm-supply-chain-attack` — card chips**

Find: `<span class="art-title">The LiteLLM PyPI Attack: A Supply Chain Postmortem</span></div>`
Replace: `<span class="art-title">The LiteLLM PyPI Attack: A Supply Chain Postmortem</span><span class="card-flavors"><span class="card-flavor">supply-chain</span></span></div>`

- [ ] **Step 35: Verify 17 rows got attributes and chips, and the 2 excluded rows did not**

Run: `grep -c 'data-flavors=' index.html`
Expected: `17`

Run: `grep -c 'class="card-flavors"' index.html`
Expected: `17`

Run: `grep -E 'data-product-manifesto|amazon-s3-files' index.html | grep -c 'data-flavors'`
Expected: `0`

Run (every flavor used must be one of the 11 in the vocabulary):
`grep -oE 'data-flavors="[^"]+"' index.html | tr ' "' '\n\n' | sed 's/data-flavors=//' | grep -vE '^(agents|agentic-coding|models|evals|craft|prompting|cost-latency|supply-chain|provenance|rag|research|)$'`
Expected: **no output** (any output is a typo'd flavor).

- [ ] **Step 36: Commit**

```bash
git add index.html
git commit -m "Tag every article row with data-flavors + visible card chips"
```

---

## Task 3: Add the search box and flavor filter bar markup

**Files:**
- Modify: `index.html` (around the existing `.filter-bar`, ~line 825)

- [ ] **Step 1: Replace the filter-bar block with search + two filter rows**

Find this exact block (the whole existing filter bar):

```html
    <div class="filter-bar">
      <button class="filter-pill active" data-filter="all">All</button>
      <button class="filter-pill" data-filter="ai-engineering">AI Engineering</button>
      <button class="filter-pill" data-filter="security">Security</button>
      <button class="filter-pill" data-filter="infrastructure">Infrastructure</button>
      <button class="filter-pill" data-filter="policy">Policy</button>
      <button class="filter-pill" data-filter="data">Data</button>
      <button class="filter-pill" data-filter="interactive">Interactive</button>
    </div>
```

Replace with:

```html
    <input type="search" id="article-search" class="article-search" placeholder="Search articles by title, description, or tag…" aria-label="Search articles" autocomplete="off">

    <div class="filter-row">
      <span class="filter-lead">Topic</span>
      <div class="filter-bar">
        <button class="filter-pill active" data-filter="all">All</button>
        <button class="filter-pill" data-filter="ai-engineering">AI Engineering</button>
        <button class="filter-pill" data-filter="security">Security</button>
        <button class="filter-pill" data-filter="infrastructure">Infrastructure</button>
        <button class="filter-pill" data-filter="policy">Policy</button>
        <button class="filter-pill" data-filter="data">Data</button>
        <button class="filter-pill" data-filter="interactive">Interactive</button>
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-lead">Flavor</span>
      <div class="flavor-bar">
        <button class="flavor-chip" data-flavor="agents">agents</button>
        <button class="flavor-chip" data-flavor="agentic-coding">agentic-coding</button>
        <button class="flavor-chip" data-flavor="models">models</button>
        <button class="flavor-chip" data-flavor="evals">evals</button>
        <button class="flavor-chip" data-flavor="craft">craft</button>
        <button class="flavor-chip" data-flavor="prompting">prompting</button>
        <button class="flavor-chip" data-flavor="cost-latency">cost-latency</button>
        <button class="flavor-chip" data-flavor="supply-chain">supply-chain</button>
        <button class="flavor-chip" data-flavor="provenance">provenance</button>
        <button class="flavor-chip" data-flavor="rag">rag</button>
        <button class="flavor-chip" data-flavor="research">research</button>
      </div>
    </div>
```

- [ ] **Step 2: Verify the controls exist and chip count is 11**

Run: `grep -c 'class="flavor-chip"' index.html`
Expected: `11`

Run: `grep -c 'id="article-search"' index.html`
Expected: `1`

Run (chip data-flavor values must match the vocabulary exactly):
`grep -oE 'data-flavor="[^"]+"' index.html | sort | sed 's/data-flavor=//' | tr -d '"' | grep -vE '^(agents|agentic-coding|cost-latency|craft|evals|models|prompting|provenance|rag|research|supply-chain)$'`
Expected: **no output**.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add search input and flavor filter bar to article listing"
```

---

## Task 4: Wire flavor + search into the filter JS

**Files:**
- Modify: `index.html` (the article-filter IIFE, ~lines 1303–1365)

- [ ] **Step 1: Add state + DOM handles next to the existing ones**

Find this exact block:

```js
   const ARTICLES_PER_PAGE = 10;
   let currentPage = 1;
   let currentFilter = 'all';
   const allRows     = Array.from(document.querySelectorAll('.articles-list .art-row'));
   const pills       = document.querySelectorAll('.filter-pill');
```

Replace with:

```js
   const ARTICLES_PER_PAGE = 10;
   let currentPage = 1;
   let currentFilter = 'all';
   let currentFlavor = null;
   let currentSearch = '';
   const allRows     = Array.from(document.querySelectorAll('.articles-list .art-row'));
   const pills       = document.querySelectorAll('.filter-pill');
   const flavorChips = document.querySelectorAll('.flavor-chip');
   const searchInput = document.getElementById('article-search');
```

- [ ] **Step 2: Replace `filteredRows()` with the three-predicate version**

Find this exact block:

```js
   function filteredRows() {
     if (currentFilter === 'all') return allRows;
     return allRows.filter(r => (r.dataset.tags || '').split(' ').includes(currentFilter));
   }
```

Replace with:

```js
   function matchesCategory(r) {
     return currentFilter === 'all'
       || (r.dataset.tags || '').split(' ').includes(currentFilter);
   }
   function matchesFlavor(r) {
     return !currentFlavor
       || (r.dataset.flavors || '').split(' ').includes(currentFlavor);
   }
   function matchesSearch(r) {
     if (!currentSearch) return true;
     return r.textContent.toLowerCase().includes(currentSearch);
   }
   function filteredRows() {
     return allRows.filter(r => matchesCategory(r) && matchesFlavor(r) && matchesSearch(r));
   }
```

- [ ] **Step 3: Add flavor-chip + search listeners after the existing `pills.forEach` block**

Find this exact block:

```js
   pills.forEach(pill => {
     pill.addEventListener('click', () => {
       pills.forEach(p => p.classList.remove('active'));
       pill.classList.add('active');
       currentFilter = pill.dataset.filter;
       renderPage(1);
     });
   });
```

Insert the following directly after it:

```js

   flavorChips.forEach(chip => {
     chip.addEventListener('click', () => {
       const f = chip.dataset.flavor;
       if (currentFlavor === f) {
         currentFlavor = null;
         chip.classList.remove('active');
       } else {
         flavorChips.forEach(c => c.classList.remove('active'));
         chip.classList.add('active');
         currentFlavor = f;
       }
       renderPage(1);
     });
   });

   if (searchInput) {
     searchInput.addEventListener('input', () => {
       currentSearch = searchInput.value.trim().toLowerCase();
       renderPage(1);
     });
   }
```

- [ ] **Step 4: Static sanity check of the JS (no syntax error, names consistent)**

Run: `node --check <(sed -n '/Article filter + pagination/,/Nav active section highlight/p' index.html)` — if that fails due to the `<(` process substitution in your shell, instead run the next check.

Run: `grep -c 'matchesCategory\|matchesFlavor\|matchesSearch\|currentFlavor\|currentSearch\|flavorChips' index.html`
Expected: a count of 12 or more (each name appears multiple times).

Run: `grep -c "getElementById('article-search')" index.html`
Expected: `1`

- [ ] **Step 5: Manual browser verification**

Start a local server: `python3 -m http.server 8099` (run in background), then open `http://localhost:8099/` in a browser. Verify each, then stop the server:

1. The search box, a "Topic" row of pills, and a "Flavor" row of 11 chips all render above the article list, in that order.
2. Each article card shows its flavor chips (e.g. "From TODO to TOKNOW" shows `#craft #agentic-coding`); the Data Manifesto and S3 cards show none.
3. Click flavor `agents` → only the 3 agents articles remain (Agentic OCR, Self-Improving AI, Moral Surrender); pagination info updates to "Showing 1–3 of 3".
4. With `agents` still active, click category `Security` → "No articles found" (no overlap) — confirms AND combination.
5. Reset category to `All`, click `agents` again → it clears (chip de-highlights), full list returns.
6. Type `retrieval` in search → only "Contextual retrieval, honestly" remains.
7. Clear search → full list (page 1) returns.
8. Toggle the theme button (☾/☀) → search box, chips, and card chips all readable in both light and dark; no white-on-white or invisible borders.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Wire flavor filter and client-side search into article listing JS"
```

---

## Task 5: Document the vocabulary (in-file comment + CLAUDE.md)

**Files:**
- Modify: `index.html` (comment above `.articles-list`)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add an HTML comment above the articles list**

Find this exact line:

```html
    <div class="articles-list">
```

Replace with:

```html
    <!--
      Article tagging: each .art-row carries data-tags (broad category, drives the Topic pills)
      and data-flavors (space-separated cross-cutting flavors, drives the Flavor chips + the
      visible .card-flavors chips). Flavor vocabulary (keep in sync with the .flavor-bar buttons):
        agents · agentic-coding · models · evals · craft · prompting ·
        cost-latency · supply-chain · provenance · rag · research
      A new flavor must be added to (a) this list, (b) a .flavor-chip button in the .flavor-bar,
      and (c) the row's data-flavors + .card-flavors chips.
    -->
    <div class="articles-list">
```

- [ ] **Step 2: Add a line to CLAUDE.md under the homepage/components notes**

Find this exact line in `CLAUDE.md`:

```
- `<footer>` — surface, border-top. Left: plain text. Right: links.
```

Insert directly after it:

```
- **Homepage article tagging (`index.html`):** each `.art-row` has `data-tags` (broad category → Topic pills) **and** `data-flavors` (space-separated cross-cutting flavors → Flavor chips + visible `.card-flavors` chips). The article list also has a client-side search box (`#article-search`) that substring-matches row text; Topic + Flavor + search combine with AND. Flavor vocabulary: `agents, agentic-coding, models, evals, craft, prompting, cost-latency, supply-chain, provenance, rag, research`. Adding a flavor means updating the `.flavor-bar` buttons, the in-file comment above `.articles-list`, and the row's attributes/chips.
```

- [ ] **Step 3: Verify the docs landed**

Run: `grep -c 'Flavor vocabulary\|data-flavors' index.html CLAUDE.md`
Expected: both files report at least 1 match.

- [ ] **Step 4: Commit**

```bash
git add index.html CLAUDE.md
git commit -m "Document flavor tag vocabulary in index.html and CLAUDE.md"
```

---

## Task 6: Final full-page regression check

**Files:** none (verification only)

- [ ] **Step 1: Re-run the static assertions in one pass**

```bash
echo "flavor chips (want 11):    $(grep -c 'class="flavor-chip"' index.html)"
echo "rows with flavors (17):    $(grep -c 'data-flavors=' index.html)"
echo "cards with chips (17):     $(grep -c 'class="card-flavors"' index.html)"
echo "search input (1):          $(grep -c 'id="article-search"' index.html)"
```
Expected: 11 / 17 / 17 / 1.

- [ ] **Step 2: Manual regression of the pre-existing behavior**

Serve and open the page (`python3 -m http.server 8099`). Confirm the original features still work:
1. Category pills alone still filter exactly as before (click `Security` → 2 articles).
2. Pagination still appears when >10 rows match (All shows page controls; "Showing 1–10 of 19").
3. Clicking a card still navigates to the article (the card chips did not break the `<a>` link).
4. Nav, hero, publications, and footer are visually unchanged.

Stop the server when done.

- [ ] **Step 3: Confirm a clean working tree**

Run: `git status --short`
Expected: empty (all changes committed).

---

## Self-Review

**Spec coverage:**
- §1 flavor vocabulary + per-article assignment → Task 2 (full table) + verified in Task 2 Step 35. ✓
- §2 search box → Task 1 (CSS) + Task 3 (markup) + Task 4 (JS). ✓
- §2 category row unchanged → Task 3 keeps identical buttons. ✓
- §2 flavor row single-select toggle → Task 4 Step 3 toggle logic. ✓
- §2 display-only card chips → Task 2 (markup), Task 1 (`.card-flavor` CSS, no pointer/click). ✓
- §2 variables-only, no hardcoded mode colors → Task 1 Step 3 grep guard. ✓
- §3 three-predicate AND filter + page reset → Task 4 Steps 2–3. ✓
- §3 `data-flavors` attribute, `data-tags` unchanged → Task 2 Part A leaves `data-tags` intact. ✓
- §4 in-file comment + CLAUDE.md note → Task 5. ✓
- Acceptance criteria 1–7 → covered by Task 4 Step 5 + Task 6 manual checks. ✓

**Placeholder scan:** No TBD/TODO; every code/markup step shows exact find/replace text. ✓

**Type/name consistency:** `currentFlavor`, `currentSearch`, `flavorChips`, `searchInput`, `matchesCategory`, `matchesFlavor`, `matchesSearch`, `filteredRows` used identically in Task 4 Steps 1–4. `data-flavor` (singular, on chip buttons) vs `data-flavors` (plural, on rows) is intentional and consistent. CSS classes `.flavor-chip` / `.flavor-bar` / `.card-flavors` / `.card-flavor` / `.article-search` / `.filter-row` / `.filter-lead` match between Task 1 (CSS), Task 2/3 (markup), and Task 4 (JS selectors). ✓
