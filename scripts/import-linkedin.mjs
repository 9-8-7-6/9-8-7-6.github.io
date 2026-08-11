/**
 * Turns a LinkedIn data export into Markdown drafts in posts/.
 *
 *   node scripts/import-linkedin.mjs ~/Downloads/Shares.csv     # short posts
 *   node scripts/import-linkedin.mjs ~/Downloads/Articles       # long articles
 *
 * Get the export from LinkedIn on desktop: Settings & Privacy -> Data privacy ->
 * Get a copy of your data. "Want something in particular?" -> Posts is ready in
 * about ten minutes; the full archive takes up to 24 hours and is the one that
 * includes the Articles folder. Download links expire after 72 hours.
 *
 * Everything imported is marked draft: true. Nothing publishes until you have
 * read it, given it a real title, and expanded it — a post written for a feed
 * is not yet an article.
 */

import { readFile, writeFile, mkdir, access, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];

if (!input) {
  console.error("Usage: node scripts/import-linkedin.mjs <Shares.csv | Articles-folder>");
  process.exit(1);
}

/* ============================ shared ============================ */

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 7)
    .join("-") || "post";

const used = new Set();
function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
}

async function writeDraft({ slug, title, date, link, body }) {
  const file = path.join(ROOT, "posts", `${slug}.md`);
  try {
    await access(file);
    console.log(`  kept existing posts/${slug}.md`);
    return false;
  } catch { /* not there yet */ }

  const front = [
    "---",
    `title: "${title.replace(/"/g, "'")}"`,
    `date: ${date}`,
    'summary: ""',
    link ? `linkedin: ${link}` : "linkedin:",
    "draft: true",
    "---",
    "",
  ].join("\n");

  await writeFile(file, `${front}${body}\n`);
  console.log(`  wrote posts/${slug}.md`);
  return true;
}

/* ============================ mode: Shares.csv ============================ */

/** Minimal RFC 4180 reader: handles quoted fields, embedded commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function importShares(file) {
  const rows = parseCsv(await readFile(file, "utf8"));
  if (!rows.length) throw new Error("No rows found in that file.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iDate = col("date");
  const iText = col("sharecommentary", "commentary", "text");
  const iLink = col("sharelink", "link", "url", "postlink");

  if (iText === -1) {
    throw new Error(`Could not find the post text column. Columns seen: ${header.join(", ")}`);
  }

  let written = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const text = (row[iText] || "").trim();
    if (text.length < 120) { skipped++; continue; } // one-liners and reshares are not articles

    const date = (row[iDate] || "").slice(0, 10) || "1970-01-01";
    const link = (row[iLink] || "").trim();

    const lines = text.split("\n").map((l) => l.trim());
    const firstLine = lines.find(Boolean) || "Untitled";
    const title =
      firstLine.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "").slice(0, 90) ||
      "Untitled";
    const rest = lines.slice(lines.indexOf(firstLine) + 1).join("\n").trim();

    const body = (rest || text)
      .split(/\n{2,}/)
      .map((para) => para.split("\n").join(" ").trim())
      .filter(Boolean)
      .join("\n\n");

    if (
      await writeDraft({
        slug: uniqueSlug(`${date.slice(0, 7)}-${slugify(title)}`),
        title,
        date,
        link,
        body,
      })
    ) written++;
  }

  return { written, skipped, kind: "posts" };
}

/* ============================ mode: Articles folder ============================ */

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

/** Tolerant HTML-to-Markdown pass for LinkedIn's exported article files. */
function htmlToMarkdown(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "");

  const wrapper = s.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (wrapper) s = wrapper[1];

  s = s
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "") // the title is handled separately
    .replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, t) => `\n\n${"#".repeat(Number(lvl))} ${t}\n\n`)
    .replace(/<h[456][^>]*>([\s\S]*?)<\/h[456]>/gi, "\n\n### $1\n\n")
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, c) => `\n\n\`\`\`\n${c}\n\`\`\`\n\n`)
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => `\n\n\`\`\`\n${c}\n\`\`\`\n\n`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => `\n\n> ${c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `\n- ${c.replace(/\s+/g, " ").trim()}`)
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, "\n\n![$1]($2)\n\n")
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, "\n\n![]($1)\n\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(s)
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function importArticles(dir) {
  const files = (await readdir(dir)).filter((f) => /\.html?$/i.test(f)).sort();
  if (!files.length) throw new Error(`No .html files found in ${dir}`);

  let written = 0;
  let skipped = 0;

  for (const name of files) {
    const full = path.join(dir, name);
    const html = await readFile(full, "utf8");

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title =
      decodeEntities((titleMatch?.[1] || name.replace(/\.html?$/i, "")).replace(/<[^>]+>/g, "")).trim().slice(0, 120) ||
      "Untitled";

    // Date: ISO date in the filename, a <time datetime>, any ISO date in the body,
    // and only then the file's own timestamp. Always worth checking by hand.
    const iso =
      name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ||
      html.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})/i)?.[1] ||
      html.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ||
      (await stat(full)).mtime.toISOString().slice(0, 10);

    const link = html.match(/https:\/\/www\.linkedin\.com\/pulse\/[^\s"'<)]+/i)?.[0] || "";

    const body = htmlToMarkdown(html);
    if (body.length < 80) {
      console.log(`  skipped ${name}: almost no text found`);
      skipped++;
      continue;
    }

    if (await writeDraft({ slug: uniqueSlug(`${iso.slice(0, 7)}-${slugify(title)}`), title, date: iso, link, body })) {
      written++;
    }
  }

  return { written, skipped, kind: "articles" };
}

/* ============================ run ============================ */

await mkdir(path.join(ROOT, "posts"), { recursive: true });

let result;
try {
  const info = await stat(input);
  result = info.isDirectory() ? await importArticles(input) : await importShares(input);
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}

console.log(
  `\nImported ${result.written} ${result.kind} as drafts` +
    (result.skipped ? `, skipped ${result.skipped}` : "") +
    ".\n\nNext:\n" +
    "  1. Open each posts/*.md — real title, real summary, expand the argument.\n" +
    "  2. Check the dates; imports guess when the export does not say.\n" +
    "  3. Remove draft: true when a post is ready to publish.\n" +
    "  4. node scripts/build.mjs --drafts   # preview everything, drafts included\n",
);
