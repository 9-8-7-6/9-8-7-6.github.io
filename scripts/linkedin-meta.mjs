/**
 * Reads a LinkedIn post URL and prints the front matter for it.
 *
 *   node scripts/linkedin-meta.mjs "https://www.linkedin.com/posts/you_slug-share-7492...-CeRT/?utm_source=..."
 *
 * Why this works: LinkedIn share and activity IDs are snowflake-style. The
 * leading bits of the 64-bit ID are a unix millisecond timestamp (id >> 22), so the
 * publish date is recoverable from the URL alone — no data export needed.
 * Check the result against the post once; if it looks off, trust the post.
 */

const raw = process.argv[2];

if (!raw) {
  console.error('Usage: node scripts/linkedin-meta.mjs "<linkedin post url>"');
  process.exit(1);
}

/* ---------- pull the numeric id out of any of LinkedIn's URL shapes ---------- */
const id =
  raw.match(/(?:share|activity|ugcPost)[-:](\d{15,25})/i)?.[1] ||
  raw.match(/urn%3Ali%3A(?:share|activity|ugcPost)%3A(\d{15,25})/i)?.[1] ||
  raw.match(/(\d{19})/)?.[1];

if (!id) {
  console.error("Could not find a post id in that URL. Paste the full link, including the -share-… or -activity-… part.");
  process.exit(1);
}

/* ---------- decode the timestamp: the id shifted right by 22 bits ---------- */
const ms = Number(BigInt(id) >> 22n);
const when = new Date(ms);

const year = when.getUTCFullYear();
if (Number.isNaN(ms) || year < 2010 || year > 2100) {
  console.error(`Decoded an implausible date from id ${id}. Read the date off the post instead.`);
  process.exit(1);
}

/** Format in a fixed +08:00 offset, which is what Taipei uses year round. */
const taipei = new Date(ms + 8 * 60 * 60 * 1000);
const iso = taipei.toISOString().slice(0, 10);
const clock = taipei.toISOString().slice(11, 16);
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][taipei.getUTCDay()];

/* ---------- clean the URL: drop tracking parameters ---------- */
const canonical = raw.split("?")[0].replace(/\/+$/, "");

/* ---------- suggest a filename from the slug LinkedIn built ---------- */
const slugText =
  canonical.match(/\/posts\/[^_]+_(.+?)-(?:share|activity|ugcPost)-\d+/i)?.[1] ||
  canonical.match(/\/pulse\/([a-z0-9-]+?)-[a-z0-9]{6,}$/i)?.[1] ||
  "";

const suggested = slugText
  ? `${iso.slice(0, 7)}-${slugText.split("-").filter(Boolean).slice(0, 6).join("-")}`
  : `${iso.slice(0, 7)}-rename-me`;

console.log(`
Published   ${iso} ${clock} Taipei (${weekday})
Post id     ${id}

Suggested filename
  posts/${suggested}.md
  -> retitle it around the topic, not LinkedIn's auto-slug

Front matter, ready to paste
---
title: ""
date: ${iso}
summary: ""
linkedin: ${canonical}
draft: true
---
`);
