# Mac AI Dev Setup

An interactive guide at <https://tech.anujsadani.in/mac-ai-dev-setup/>. Tick the tools your projects need and it writes the Terminal commands in order, with a check after each step.

| File | What it is |
|---|---|
| `index.html` | The page. Generated, do not edit by hand. |
| `steps.js` | The tools, presets, form fields and every step's commands. Pure functions, no DOM, so the tests load it too. |
| `scripts/repo-needs.sh` | Read-only scanner: reports which tools each cloned repo needs. |
| `scripts/setup-repo.sh` | Installs one repo's dependencies from its lockfile. |
| `scripts/link-skills.sh` | Lists, then links, Claude Code skills found in cloned repos. |

The page embeds the three scripts so it works offline. They are also served as plain files so you can read them before running anything.

## Change it

1. Edit `steps.js` (commands), `scripts/*.sh`, or `templates/mac-ai-dev-setup.template.html` (layout).
2. Regenerate the page: `node scripts/build-mac-setup.js`
3. Check everything: `node --test test/*.test.js`

The tests parse every generated command block with `bash -n` (and `zsh -n` when installed), check that file writes are guarded so a re-run changes nothing, check that typed values cannot break out of a command, and fail if `index.html` is out of date.

Title, description and date come from the `mac-ai-dev-setup` entry in `data/articles.json`.

## Honest labels

Each step carries a badge saying how it was verified: run on a real machine, tested in a scratch home folder, mirrors a working setup, or a standard command from the tool's own docs that was not run. Keep those accurate when you change a step.
