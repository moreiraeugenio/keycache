# keycache.app

The landing page for Keycache. Plain HTML, CSS and one script — no framework, no
build step, no dependencies. Deployed to Vercel by
[`.github/workflows/deploy-site.yml`](../.github/workflows/deploy-site.yml) on
every push to `main` that touches `site/`.

## Local preview

```bash
npm run site:assets                      # copies demo.gif in from ../assets (gitignored here)
cd site && python3 -m http.server 8000   # no install needed; or `npx serve site` from the root
```

Opening `index.html` with `file://` mostly works, but the absolute asset paths
(`/styles.css`, `/assets/demo.gif`) won't resolve, so use a server.

## Assets

| File                  | Source                                     | Committed? |
| --------------------- | ------------------------------------------ | ---------- |
| `assets/demo.gif`     | copy of `../assets/demo.gif`               | no         |
| `assets/og.png`       | `../scripts/og-card.html`                  | yes        |
| `assets/icon.png`     | `../scripts/icon-card.html`                | yes        |

`demo.gif` is copied rather than duplicated in git — 2.7 MB is not worth storing
twice, and a copy can drift from the original. The other two are designed assets
rather than copies, so they're committed. Edit the HTML card and re-render:

```bash
npm run site:images
```

## Download links

The release artifacts are version-stamped (`Keycache-0.4.1-arm64.dmg`), so
GitHub's `/releases/latest/download/<asset>` shortcut can't resolve them — that
only works for fixed filenames. `downloads.js` asks the GitHub API for the
latest release and rewrites the hrefs, caching the response in `sessionStorage`
for an hour to stay well under the unauthenticated rate limit.

Every link in `index.html` already points at the releases page, so the page
degrades to something useful if the script fails, is blocked, or never runs.

## Discoverability

- `robots.txt` allows everything, and names the AI crawlers (`GPTBot`,
  `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `OAI-SearchBot`) explicitly so
  that allowing them reads as a decision. Blocking them would keep Keycache out
  of AI answers without helping its search ranking.
- `sitemap.xml` lists the one page, with no `<lastmod>` — a hand-maintained date
  that goes stale is worse than none.
- Two `application/ld+json` blocks in `index.html`: `SoftwareApplication` and
  `FAQPage`. These are data blocks rather than executable scripts, so the page's
  `script-src` CSP doesn't apply to them.

**If you edit the FAQ copy, edit the `FAQPage` block to match.** Structured data
that disagrees with the visible page is a manual-action risk, not a clever
trick.

What this file can't do is the part that actually matters: a new domain gets
indexed because other indexed pages link to it. The repo's homepage field, the
README, the Homebrew tap and awesome-list entries are worth more than everything
above combined — see [#61](https://github.com/moreiraeugenio/keycache/issues/61).
Verifying the domain in Google Search Console and submitting the URL is the
fastest way onto the index.

## Vercel setup

One-time, on the account that owns the project:

```bash
cd site
npx vercel link          # writes .vercel/project.json (gitignored)
cat .vercel/project.json # the two IDs below
```

Then add these to the repo under **Settings → Secrets and variables → Actions**:

| Kind     | Name                | Value                                     |
| -------- | ------------------- | ----------------------------------------- |
| Secret   | `VERCEL_TOKEN`      | account token from Vercel → Settings → Tokens |
| Variable | `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`       |
| Variable | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json`   |

Finally, add `keycache.app` to the Vercel project (apex, with `www` redirecting
to it) and point the domain's DNS at Vercel.

Leave the Vercel Git integration **disconnected** — the workflow is the only
thing that should deploy, otherwise every push deploys twice.
