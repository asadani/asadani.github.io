---
name: asadani-tech-publish
description: Turn a technical idea into a researched, challenged, site-ready article for tech.anujsadani.in using this repository's canonical design system and publishing workflow. Use for new essays, article rewrites, or preparing an article for publication. Do not publish, commit, push, or open a PR without explicit user approval.
---

# Asadani Tech Publish

Create articles that feel native to Anuj Sadani's technical writing site, not generic AI-generated blog posts.

## Source of truth

Before drafting or editing an article:

1. Read `CLAUDE.md` for the current site/design/publishing rules.
2. Read `_template/article.html` for the canonical article structure.
3. Read at least one relevant, finished article from this repository as a worked example. Prefer a recent article with a similar content shape. If no better example is obvious, use `spec-lies-until-something-runs-it/index.html`.
4. If the task concerns an existing article, read that article before proposing changes.

Do not copy old inline styling or resurrect retired per-topic themes. The current template and `CLAUDE.md` win if examples disagree.

## Workflow

### 1. Understand the idea

Extract:
- the central claim;
- the useful distinction or tension;
- what is observation vs evidence vs speculation;
- who the article is for;
- what the reader should understand differently afterward.

Do not immediately turn rough thinking into polished prose.

### 2. Challenge the thesis

Before drafting:
- identify where the framing may be too broad;
- separate overlapping dimensions that are being treated as one spectrum;
- look for counterexamples;
- flag terminology that is marketing language, emerging language, or non-standard;
- distinguish correlation, prediction, and opinion from established fact.

Preserve a good unresolved question rather than manufacturing certainty.

### 3. Research when needed

For claims about current products, companies, standards, research, model capabilities, benchmarks, dates, or market behavior, verify against primary or high-quality sources.

Prefer:
1. original papers/specifications/documentation;
2. official product/company sources;
3. strong independent technical sources.

Do not pad the article with citations for obvious reasoning or the author's own thesis. Never invent a source.

### 4. Build the argument

Prefer a thesis-led structure over a generic tutorial structure.

A common shape is:
1. sharp opening observation;
2. the confusion/problem;
3. the distinction or model;
4. concrete examples;
5. edge cases/counterargument;
6. implications;
7. concise ending that leaves the reader with a useful mental model.

Do not force this shape if the material wants a different one.

### 5. Write in Anuj's voice

Default characteristics:
- direct and conversational;
- technically literate without sounding academic for its own sake;
- short, clear sentences mixed with occasional longer explanatory ones;
- concrete examples before abstraction when possible;
- strong distinctions and memorable formulations;
- willing to say "I think", "the useful distinction is", or "this is where the model breaks";
- avoid hype and inflated claims;
- avoid generic openings such as "In today's rapidly evolving AI landscape";
- avoid excessive headings, bullet spam, fake quotes, rhetorical filler, and repetitive summaries;
- do not use em dashes. Use commas, colons, parentheses, or full stops instead.

A memorable line should emerge from the argument, not be inserted merely to sound quotable.

### 6. Use visuals as reasoning tools

Use a table, diagram, matrix, or callout only when it compresses an idea better than prose.

For taxonomies, distinguish independent axes instead of forcing unrelated concepts onto one maturity ladder. For evolution, make clear whether the arrows mean chronology, increasing autonomy, architectural dependence, or something else.

### 7. Translate into the site template

Create `<topic-slug>/index.html` from `_template/article.html`.

Preserve:
- light/dark theme behavior;
- nav and home link;
- CSS variables and component classes;
- responsive behavior;
- footer;
- canonical/OG/JSON-LD metadata structure.

Fill every required placeholder, especially:
- description;
- slug;
- ISO publication date.

Use the existing components described in `CLAUDE.md`; do not invent a parallel design system.

### 8. Register and validate

Prepare the matching entry in `data/articles.json`, including the same description used in article metadata.

Then run or account for the repository's required SEO workflow:
`node scripts/seo.js`

Validate:
- no unresolved `{{PLACEHOLDERS}}`;
- nav/home link exists;
- light and dark theme scripts remain intact;
- headings have stable section ids and self-links where required;
- internal links and source links are valid;
- mobile layout is not obviously broken;
- article metadata and `data/articles.json` agree;
- sitemap/robots/llms metadata is regenerated when publishing.

### 9. Publishing safety

Drafting files is not permission to publish.

Before any commit, push, merge, PR, or other remote mutation:
- summarize the files that will change;
- show the proposed article title, slug, and central thesis;
- ask for explicit approval unless the user already explicitly instructed that exact publishing action.

Prefer a branch + PR for substantial new articles when the user has not requested a direct commit to the default branch.

## Definition of done

A finished article should pass five tests:

1. **Argument:** there is a clear claim, not merely a collection of information.
2. **Integrity:** important factual claims are verified and uncertainty is visible.
3. **Voice:** it reads like Anuj's existing work, not generic AI copy.
4. **Design:** it uses the repository's current article system faithfully.
5. **Publishability:** metadata, article registry, SEO outputs, links, and responsive structure are accounted for.
