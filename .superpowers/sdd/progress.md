# Site Uplift — progress ledger
Task 1: complete (review clean — 8/8 tests, code matches plan)
Task 2: complete (24 articles migrated, 15/15 tests, render EQUIVALENT to original)
Task 4: complete (site.css extracted, braces balanced, homepage components present)
Task 7: complete (article.css extracted 595 lines balanced; template links it, theme script + 47 placeholders intact)
Task 3: complete (publications.json: 1 book/2 papers/3 digital; SSRN deferred pending title; 19/19 tests)
Task 5: complete (build pipeline; index.html generated; 20/20 incl equivalence; idempotent; 3 pub buckets)
Task 6: complete (Direction A applied; pillars 24/2/4; order monotonic; 20/20 tests)
Task 1 (card redesign): complete (commits 1a8a0bb..0a5439d, review Approved, 23/23 tests)
Task 2 (card CSS): complete (commit f43a1b1, review Approved — ssrn-color finding was a false positive; 23/23 tests)
Flip Task 1 (data): complete (commit 0fc321d, papers->3, dateDisplay added, inline-verified)
Flip Task 2 (renderFlipCard): complete (commit 078e153, review Approved, 24/24, 7 cards/3 grids)
Flip Task 3 (CSS): complete (commit 08d0877, review Approved, 24/24)
  MINOR (final-pass triage): .flipcard-toggle:focus-visible uses outline-offset:-2px; the inset ring can be clipped by the face's rounded corners — consider an outset ring or moving focus style to .flipcard for keyboard a11y.
Flip Task 4 (toggle JS): complete (commit a50a583, inline-verified; browser check pending human)
Final review: MERGE (clean). Fixed Important #1 (injectBlocks $-escaping). Minors logged: hidden-face tab order, focus-ring inset, formatDate dead code, scripts/ one-shots.
