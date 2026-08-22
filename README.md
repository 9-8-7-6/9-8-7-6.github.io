# vito-lin-dev.github.io

Personal site for Vito Lin. Hand-written HTML and CSS, one typeface, no JavaScript
on the page and no npm packages anywhere. Posts are Markdown; a build script that
uses only Node's standard library turns them into static HTML.

```
posts/*.md            ← you write here
data/profile.json     ← identity, hero line, about text, links
data/github.json      ← generated: repos and pull requests
templates/base.html   page shell
assets/style.css      the whole design
scripts/build.mjs     Markdown → HTML, plus RSS and sitemap
scripts/fetch-github.mjs      GitHub API → data/github.json
scripts/import-linkedin.mjs   Shares.csv → posts/*.md drafts
index.html writing/ about/ 404.html feed.xml sitemap.xml   ← generated, do not hand-edit
```

## Replace the old site

```bash
cd ~/Desktop
mv vito-lin-dev.github.io vito-lin-dev.github.io.old
# unzip the new archive here, so that ~/Desktop/vito-lin-dev.github.io/index.html exists
```

If you already pushed the old version, keep the same repo and force the new tree in:

```bash
cd ~/Desktop/vito-lin-dev.github.io
git init -b main
git add .
git commit -m "feat: rebuild site, refined minimal"
git remote add origin https://github.com/vito-lin-dev/vito-lin-dev.github.io.git
git push -u origin main --force
```

Then check **Settings → Pages** is on `main` / `/ (root)`, and
**Settings → Actions → General → Workflow permissions** is *Read and write*.

## Daily use

```bash
node scripts/build.mjs            # build published posts
node scripts/build.mjs --drafts   # include draft: true, for previewing
python3 -m http.server 8000       # preview at http://localhost:8000
```

Push to `main` and the workflow refreshes the GitHub data, rebuilds, and commits the
output. You never edit generated HTML by hand.

## Writing a post

Create `posts/my-slug.md`. The filename becomes the URL: `/writing/my-slug/`.

```markdown
---
title: "Why cuTile's tutorial imports are broken"
date: 2026-08-11
summary: "A stale import path in the official examples, the compile error it produces, and the two lines that fix it."
linkedin: https://www.linkedin.com/posts/vitothedev_...
---

Body starts here. Markdown subset: `##`/`###` headings, paragraphs, **bold**,
*italic*, `code`, [links](https://example.com), bullet and numbered lists,
blockquotes, images, fenced code blocks. Lists do not nest.
```

Only `title` and `date` are required. `summary` is what people read in the list, the
RSS feed and Google results — write it for a stranger. `draft: true` keeps a post out
of the build.

## Moving your existing LinkedIn posts across

First work out which kind you have. Open one of your posts and look at its URL:
`/posts/...` is a short feed post, `/pulse/...` is a long-form Article. They land in
different files in the export.

1. On desktop LinkedIn: **Settings & Privacy -> Data privacy -> Get a copy of your data**.
   - Short posts only: choose *Want something in particular?* -> **Posts**. Ready in
     roughly ten minutes.
   - If you have Articles too: request the **larger archive**. It takes up to 24 hours
     and arrives in two emails.
2. Download and unzip. `Shares.csv` holds every short post with its date, URL and full
   text. `Articles/` holds one HTML file per long-form article.
3. Convert whichever you have:

```bash
node scripts/import-linkedin.mjs ~/Downloads/Shares.csv    # short posts
node scripts/import-linkedin.mjs ~/Downloads/Articles      # long articles
```

Each becomes a `posts/*.md` file with `draft: true`, its date, its LinkedIn URL, and a
provisional title. Reshares and one-liners are skipped. Article imports keep code
blocks, lists, links and blockquotes; they also drag in a stray "Published on ..."
line and sometimes a wrong date, so check the top of each file.

4. Then edit. This is the part that matters, and no script can do it:

   - Give it a title that states the finding, not the topic. "Why cuTile's tutorial
     imports fail" beats "Some notes on cuTile".
   - Write the `summary`. One or two sentences, aimed at a stranger deciding whether
     to read.
   - Paste in the things a feed post could not hold: the actual error output, the
     actual diff, the version numbers, a link to the PR.
   - Cut the feed scaffolding — the hook line that only made sense mid-scroll, the
     "thoughts?" sign-off, the hashtags.
   - Remove `draft: true`.

The download link expires after 72 hours, so keep a copy of the CSV somewhere safe.

Do not publish all ten at once. Go oldest-first over two or three weeks, so the site
reads as alive rather than dumped.

## Cross-posting from here on

Your site is the canonical version. LinkedIn gets a shorter, self-contained version —
not a copy, and not a teaser.

1. Write the full piece in `posts/`, push, confirm it is live.
2. Write a LinkedIn post that delivers the insight on its own, so that someone who
   never clicks still got something. Around 150–250 words. First two lines carry it:
   the feed truncates the rest behind *see more*.
3. Do not paste the URL in the post body. Say "full writeup on my site" instead, and
   keep the actual link in your **profile's Featured section, website field and About
   section** — those are not feed content, so no reach cost.
4. Paste the LinkedIn post URL into the post's `linkedin:` front matter and rebuild.
   The article header then links back as *Discussion on LinkedIn*, closing the loop.

**On the reach penalty, the evidence conflicts and you should know that.** Several 2026
analyses claim outbound links in the body cut reach by roughly 60% and that the old
"link in the first comment" workaround is now caught as well. A larger study of 1.3
million posts puts the drop at about 19% for a single body link and also finds the
first-comment trick no longer helps. Nobody outside LinkedIn can measure this cleanly,
and the numbers move. What every source agrees on is the part that is actually within
your control: the post has to be worth reading without the click. Build that habit and
the algorithm question mostly stops mattering.

Two structural things that beat any posting tactic:

- **One narrow topic.** Rust, CUDA, and the toolchain between them. Consistency on a
  single subject is what makes you findable and quotable; range makes you invisible.
- **Write the post the moment you fix something.** Your PR descriptions to
  `NVlabs/cuda-oxide` are already the first draft of ten articles. That is a supply of
  material almost nobody else has.

## Design notes

The layout language follows stephango.com: one narrow column (40rem), no hero — the
page opens with the latest post — hairline dividers between sections, and flat lists
(`2026 · 08  Title`) instead of cards. System font stack, so nothing loads from a
font CDN. Colors are Flexoki by Steph Ango (MIT, stephango.com/flexoki): paper
#FFFCF0 / ink #100F0F in light mode, inverted in dark mode following the system
setting, with Flexoki cyan for links — the only colour on the page. To adjust,
edit the token block at the top of assets/style.css.
