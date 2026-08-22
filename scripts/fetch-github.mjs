/**
 * Pulls public GitHub activity into data/github.json so the site loads instantly
 * and never hits API rate limits in the visitor's browser.
 *
 * Run locally:   node scripts/fetch-github.mjs
 * Run in CI:     see .github/workflows/update-data.yml (GITHUB_TOKEN is used for a higher rate limit)
 */

import { writeFile, readFile } from "node:fs/promises";

const USER = process.env.GH_USER || "vito-lin-dev";
const TOKEN = process.env.GITHUB_TOKEN || "";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": `${USER}-site-builder`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json();
}

/** Repos you own, forks excluded, most recently pushed first. */
async function getRepos() {
  const raw = await api(`/users/${USER}/repos?per_page=100&sort=pushed`);
  return raw
    .filter((r) => !r.fork && !r.archived && !r.private)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      homepage: r.homepage || null,
      description: r.description || "",
      language: r.language || null,
      topics: r.topics || [],
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushed_at: r.pushed_at,
      created_at: r.created_at,
    }))
    .sort((a, b) => b.stars - a.stars || b.pushed_at.localeCompare(a.pushed_at));
}

/** Pull requests you opened, with the ones on other people's repos flagged as upstream work. */
async function getPullRequests() {
  const q = encodeURIComponent(`author:${USER} type:pr`);
  const raw = await api(`/search/issues?q=${q}&per_page=100&sort=created&order=desc`);
  return raw.items.map((it) => {
    const repo = it.repository_url.replace("https://api.github.com/repos/", "");
    const merged = Boolean(it.pull_request?.merged_at);
    return {
      repo,
      owner: repo.split("/")[0],
      title: it.title.trim(),
      url: it.html_url,
      number: it.number,
      created_at: it.created_at,
      state: merged ? "merged" : it.state, // merged | open | closed
      upstream: repo.split("/")[0].toLowerCase() !== USER.toLowerCase(),
    };
  });
}

const [repos, pulls, profile] = await Promise.all([
  getRepos(),
  getPullRequests(),
  api(`/users/${USER}`),
]);

const data = {
  generated_at: new Date().toISOString(),
  user: {
    login: profile.login,
    name: profile.name,
    bio: profile.bio,
    avatar: profile.avatar_url,
    location: profile.location,
    followers: profile.followers,
    url: profile.html_url,
  },
  stats: {
    repos: repos.length,
    stars: repos.reduce((n, r) => n + r.stars, 0),
    pulls: pulls.length,
    upstream_pulls: pulls.filter((p) => p.upstream).length,
    upstream_orgs: [...new Set(pulls.filter((p) => p.upstream).map((p) => p.owner))],
  },
  repos,
  pulls,
};

await writeFile(
  new URL("../data/github.json", import.meta.url),
  JSON.stringify(data, null, 2) + "\n",
);

// Keep a copy of the previous run's shape handy for debugging schema changes.
try {
  await readFile(new URL("../data/posts.json", import.meta.url));
} catch {
  console.warn("data/posts.json is missing — the Writing section will render empty.");
}

console.log(
  `Wrote data/github.json — ${repos.length} repos, ${pulls.length} PRs (${data.stats.upstream_pulls} upstream).`,
);
