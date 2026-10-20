# asadani.github.io

Personal site — AI engineering, infrastructure, and security writing.

Live at **[tech.anujsadani.in](https://tech.anujsadani.in)**.

The homepage is generated from [`data/articles.json`](data/articles.json),
[`data/publications.json`](data/publications.json), and
[`templates/index.template.html`](templates/index.template.html). Edit those
sources, then run `node build.js`; do not maintain generated homepage rows by hand.

For an article hosted here, copy [`_template/article.html`](_template/article.html)
to `<slug>/index.html`, fill its placeholders, and add its catalog entry. Tutorials
and books served from separate repositories still need catalog entries here;
mark article entries `external: true` when their pages live in another repository.
Creating a GitHub repository does not automatically add it to the website.

After catalog changes, run `node scripts/seo.js --dry-run` to review SEO updates,
then `node scripts/seo.js` to apply them. It updates the sitemap, crawler files,
and supported page metadata. `data/identity.json` supplies shared author metadata.
Commit the source changes and generated files together.

Run the current build and catalog tests with:

```sh
node --test test/*.test.js
```

`test/equivalence.check.js` is a historical migration check against
`index.html.orig`, not part of the current test suite.

The main personal site, maintained in `asadani/anujsadani.in`, reads these JSON
catalogs in the browser to display the latest three essays, publications, and
counts. Its `scripts/sync-counts.js` also refreshes static fallback counters.

See [`CLAUDE.md`](CLAUDE.md) for the article design system and authoring rules.
