/**
 * Shared GitHub repository statistics.
 *
 * Build time: fetched once per process and embedded into HTML.
 * Runtime: GitHubStats.astro hydrates [data-gh-*] nodes from the public API
 * so counts stay fresh between deploys without shipping a token.
 */

import { site } from '../config/site';

export interface RepoStats {
  stars: number | null;
  forks: number | null;
  contributors: number | null;
}

let cached: RepoStats | null = null;
let inflight: Promise<RepoStats> | null = null;

export async function getRepoStats(): Promise<RepoStats> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = fetchRepoStats().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function fetchRepoStats(): Promise<RepoStats> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mouzi.cc-build',
  };
  const token = import.meta.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const fallback: RepoStats = {
    stars: site.github.starsFallback,
    forks: null,
    contributors: null,
  };

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${site.github.repo}`, {
      headers,
    });
    if (!repoRes.ok) throw new Error(`GitHub API ${repoRes.status}`);
    const repo = await repoRes.json();

    let contributors: number | null = null;
    try {
      const cRes = await fetch(
        `https://api.github.com/repos/${site.github.repo}/contributors?per_page=1&anon=true`,
        { headers },
      );
      if (cRes.ok) {
        const link = cRes.headers.get('link');
        const match = link?.match(/&page=(\d+)>; rel="last"/);
        contributors = match ? Number(match[1]) : (await cRes.json()).length;
      }
    } catch {
      /* keep null */
    }

    cached = {
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : fallback.stars,
      forks: typeof repo.forks_count === 'number' ? repo.forks_count : null,
      contributors,
    };
    return cached;
  } catch {
    cached = fallback;
    return cached;
  }
}

export function formatCount(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}
