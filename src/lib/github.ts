// GitHub REST client — public API only, no auth token.
// Unauthenticated limit is 60 requests/hour; raw file fetches via
// raw.githubusercontent.com do NOT count against it, so the scan keeps its
// API calls to a handful (repo meta + tree + commits).

import type { DeletedGhost, RepoMeta, RepoRef, SourceFile, TreeFile } from './types';
import { RepoGhostError } from './types';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';

export const MAX_TREE_FILES = 5000;
export const MAX_FILE_BYTES = 200 * 1024; // 200 KB per file
export const MAX_COMMITS = 30;
export const MAX_GHOSTS = 200;

const SCANNABLE = /\.(js|jsx|ts|tsx|mjs|cjs|py|md)$/i;

/** Accept "owner/repo" or a full github.com URL. */
export function parseRepoRef(input: string): RepoRef | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/.*)?$/i,
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

async function apiFetch(url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  } catch {
    throw new RepoGhostError(
      'network',
      "Couldn't reach GitHub. Check your connection and try again.",
    );
  }
  if (res.status === 404) {
    throw new RepoGhostError(
      'not-found',
      'Repo not found or private — RepoGhost only works on public repos.',
    );
  }
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    if (remaining === '0' && reset) {
      const resetAt = new Date(Number(reset) * 1000);
      throw new RepoGhostError(
        'rate-limited',
        `GitHub rate limit hit (60 requests/hour without sign-in). Try again after ${resetAt.toLocaleTimeString()}.`,
        resetAt,
      );
    }
    throw new RepoGhostError(
      'rate-limited',
      'GitHub refused the request (403). It may be a rate limit — wait a bit and try again.',
    );
  }
  if (!res.ok) {
    throw new RepoGhostError('network', `GitHub returned HTTP ${res.status}. Try again in a moment.`);
  }
  return res;
}

export async function getRepo(ref: RepoRef): Promise<RepoMeta> {
  const res = await apiFetch(`${API}/repos/${ref.owner}/${ref.repo}`);
  const data = await res.json();
  return {
    fullName: data.full_name as string,
    defaultBranch: (data.default_branch as string) || 'main',
    description: (data.description as string | null) ?? null,
    stars: (data.stargazers_count as number) || 0,
    sizeKb: (data.size as number) || 0,
  };
}

/** Recursive file tree. Returns files only (blobs). */
export async function getTree(
  ref: RepoRef,
  branch: string,
): Promise<{ files: TreeFile[]; truncated: boolean }> {
  const res = await apiFetch(
    `${API}/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  const data = await res.json();
  const all: TreeFile[] = ((data.tree as Array<{ type: string; path: string; size?: number }>) || [])
    .filter((e) => e.type === 'blob')
    .map((e) => ({ path: e.path, size: e.size ?? 0 }));
  const truncated = all.length > MAX_TREE_FILES;
  return { files: all.slice(0, MAX_TREE_FILES), truncated };
}

/** Fetch one file's raw text. Returns null when the file is skipped. */
export async function fetchRawFile(
  ref: RepoRef,
  branch: string,
  path: string,
): Promise<string | null> {
  const url = `${RAW}/${ref.owner}/${ref.repo}/${encodeURIComponent(branch)}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  if (text.length > MAX_FILE_BYTES) return null;
  return text;
}

/**
 * Fetch scannable source files in small concurrent batches.
 * onProgress is called with (done, total) after each file.
 */
export async function fetchSourceFiles(
  ref: RepoRef,
  branch: string,
  tree: TreeFile[],
  onProgress: (done: number, total: number) => void,
): Promise<{ files: SourceFile[]; skipped: number }> {
  const targets = tree.filter((f) => SCANNABLE.test(f.path) && !isExcluded(f.path));
  const files: SourceFile[] = [];
  let skipped = tree.length - targets.length; // excluded by type/path
  const BATCH = 8;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (f) => {
        const content = await fetchRawFile(ref, branch, f.path);
        return { path: f.path, content };
      }),
    );
    for (const r of results) {
      if (r.content === null) skipped += 1;
      else files.push({ path: r.path, content: r.content });
    }
    onProgress(Math.min(i + BATCH, targets.length), targets.length);
  }
  return { files, skipped };
}

/** Paths the analyzer never looks at. */
export function isExcluded(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.startsWith('node_modules/') ||
    p.startsWith('dist/') ||
    p.startsWith('build/') ||
    p.startsWith('.git/') ||
    p.includes('/node_modules/') ||
    p.includes('/dist/') ||
    p.includes('/build/') ||
    /\.min\.js$/i.test(p) ||
    /\.generated\./i.test(p) ||
    /\/__tests__\//.test(p) ||
    /\.test\.[jt]sx?$/.test(p) ||
    /\.spec\.[jt]sx?$/.test(p) ||
    /\.test\.py$/.test(p)
  );
}

interface CommitFile {
  filename: string;
  patch?: string;
}

/** Last N commits with their patches; extracts deleted-code ghosts. */
export async function getDeletedGhosts(ref: RepoRef): Promise<{
  ghosts: DeletedGhost[];
  commitsScanned: number;
  commitsSkippedNoPatch: number;
}> {
  const res = await apiFetch(
    `${API}/repos/${ref.owner}/${ref.repo}/commits?per_page=${MAX_COMMITS}`,
  );
  const commits = (await res.json()) as Array<{
    sha: string;
    commit: { message: string; author?: { name?: string; date?: string } };
  }>;
  const ghosts: DeletedGhost[] = [];
  let commitsSkippedNoPatch = 0;

  for (const c of commits) {
    // One extra API call per commit — 30 commits = 30 calls, which fits
    // inside the 60/hour unauthenticated budget together with meta+tree.
    const detailRes = await apiFetch(`${API}/repos/${ref.owner}/${ref.repo}/commits/${c.sha}`);
    const detail = (await detailRes.json()) as { files?: CommitFile[] };
    const files = detail.files ?? [];
    const hasPatch = files.some((f) => f.patch);
    if (!hasPatch) {
      commitsSkippedNoPatch += 1;
      continue;
    }
    // Rebuild a unified diff for the .patch download.
    const fullPatch = files
      .filter((f) => f.patch)
      .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
      .join('\n');
    for (const f of files) {
      if (!f.patch) continue;
      const hunks = extractDeletedHunks(f.patch);
      for (const hunk of hunks) {
        ghosts.push({
          id: `${c.sha.slice(0, 7)}-${f.filename}-${ghosts.length}`,
          sha: c.sha,
          shortSha: c.sha.slice(0, 7),
          message: (c.commit.message || '').split('\n')[0],
          author: c.commit.author?.name ?? 'unknown',
          date: c.commit.author?.date ?? '',
          file: f.filename,
          code: hunk,
          patch: fullPatch,
        });
      }
    }
    if (ghosts.length >= MAX_GHOSTS) break;
  }

  // Largest ghosts first (most resurrected value), capped.
  ghosts.sort((a, b) => b.code.length - a.code.length);
  return {
    ghosts: ghosts.slice(0, MAX_GHOSTS),
    commitsScanned: commits.length,
    commitsSkippedNoPatch,
  };
}

/**
 * Pull consecutive runs of deleted lines out of a unified diff patch.
 * A deleted line starts with '-' and is not the '---' file header.
 * A run of deleted lines (possibly interrupted by context lines) forms one
 * ghost; a new hunk header (@@) always starts a new ghost.
 */
export function extractDeletedHunks(patch: string): string[] {
  const hunks: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      hunks.push(current.join('\n'));
      current = [];
    }
  };
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      flush();
      continue;
    }
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    if (line.startsWith('-')) {
      current.push(line.slice(1));
    } else if (line.startsWith('+') || line.startsWith(' ')) {
      // Added/context lines break a deleted run.
      flush();
    } else if (line === '' || line.startsWith('\\')) {
      // "\ No newline at end of file" — keep the run going.
      continue;
    } else {
      flush();
    }
  }
  flush();
  // Drop trivial ghosts (single short line, e.g. a lone brace).
  return hunks.filter((h) => h.trim().length >= 3);
}
