# Syndicating a published article

Run this only after the article is live at `tech.anujsadani.in/<slug>/` and registered in `data/articles.json`. Every copy points back to the site with `canonical_url`, so the site stays the source of truth.

Tool: `scripts/syndicate.py` (run with `~/.venvs/explainer-video/bin/python`, which has Pillow; `pandoc` must be on PATH).

```
syndicate.py prepare <slug>               # build the package
syndicate.py slot                         # next free four-hour slot
syndicate.py schedule <slug> --dry-run    # show the DEV.to payload, no network
syndicate.py schedule <slug> [--at ISO]   # schedule on DEV.to
```

## Where things live
- Packages: `articles/<slug>/` in the `tech-site-syndication` repo (found through the private project registry (`repos.json`), or `$SYNDICATION_DIR`). Files: `devto.md`, `medium.md`, `medium.html`, `metadata.json`, `cover.png`, `devto-state.json`.
- Slot plan: `schedule.csv` in the same repo. The October 2026 backfill campaign (47 articles) is already recorded there; new slots continue after the last one.
- External articles (`external: true`, e.g. the MCP courses) are read from their own repo via the registry; pass `--source <file>` to override.

## Rules
- **Essays and analyses** keep their section text with a tailored lead. **Tutorials and interactive guides** (`tutorial`/`interactive` tags) become a concise learning map linking each section on the site.
- **Review before scheduling.** `prepare` writes defaults for the DEV.to title, tags (max four) and Medium topics (max five). Edit `metadata.json`, `devto.md` and `medium.md` by hand, and do not rerun `prepare --refresh` afterwards, because it overwrites hand edits.
- **AI disclosure:** Medium opens with the disclosure line; DEV.to uses `ai_disclosure_level: some_ai`. Do not remove either.
- **Medium is manual.** Medium's rules ban posting automatically or programmatically. The package (`medium.md`, `medium.html`, topics, cover, slot time) is a hand-off for the Medium editor; see the `medium-publish` skill. Never script Medium.
- **DEV.to:** the key lives in `~/.config/devto/api-key` and never in a repo or output. `schedule` refuses to modify an article that is already live, checks the readback time and canonical URL, and stops on any 401 or suspension notice. If DEV.to restricts the account, stop and tell Anuj; do not retry.
- **Approval:** `--dry-run` is free. A live `schedule` is a remote mutation, so get explicit approval for that slug and time first (see Publishing safety in SKILL.md).
