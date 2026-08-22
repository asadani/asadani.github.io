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

## Task 4: Flip-toggle script in the template

Add one delegated listener so clicking a card flips it (and back), keeping `aria-expanded` in sync, while the link strip still opens externally.

**Files:**
- Modify: `templates/index.template.html`

- [ ] **Step 1: Add the flip-toggle script before `</body>`**

In `templates/index.template.html`, insert this block immediately before the closing `</body>` tag:

```html
<script>
(function(){
  var research = document.getElementById('research');
  if(!research) return;
  research.addEventListener('click', function(e){
    if(e.target.closest('.flipcard-link')) return;       // let the venue link open
    var toggle = e.target.closest('.flipcard-toggle');
    if(!toggle) return;
    var card = toggle.closest('.flipcard');
    if(!card) return;
    var flipped = card.classList.toggle('is-flipped');
    var btns = card.querySelectorAll('.flipcard-toggle');
    for(var i=0;i<btns.length;i++){ btns[i].setAttribute('aria-expanded', flipped ? 'true' : 'false'); }
  });
})();
</script>
```

- [ ] **Step 2: Verify and rebuild**

Run: `grep -c 'flipcard-toggle' templates/index.template.html`
Expected: `≥ 1` (the script references it).
Run: `node build.js`
Run: `grep -c "addEventListener('click'" index.html`
Expected: `≥ 1` (the script made it into the output; there may be other listeners too).

- [ ] **Step 3: Run the full suite + idempotency**

Run: `node --test`
Expected: ALL PASS.
Run: `node build.js && git diff --quiet index.html && echo "idempotent"`
Expected: `idempotent`.

- [ ] **Step 4: Manual visual + interaction check (human)**

Run: `python3 -m http.server 8000` → open `http://localhost:8000/#research`. Confirm:
- Three buckets (Books / Papers / Digital), each a 3-up grid (resize → 2-up, then 1-up).
- Front: books/Ko-fi show cover + title caption; papers show a venue-tinted title panel (arXiv red, SSRN blue) with the wordmark + title; SSRN paper is present.
- Click a card → it flips to show description + meta (no repeated title); click again → flips back.
- Click the bottom venue link → opens the source in a NEW tab and does NOT flip the card.
- Keyboard: Tab to a card's main button, press Enter/Space → it flips.
Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add templates/index.template.html index.html
git commit -m "Add delegated flip-toggle script for publication cards" --no-verify
```

---

