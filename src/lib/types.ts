// Shared types for RepoGhost.

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RepoMeta {
  fullName: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  sizeKb: number;
}

export interface TreeFile {
  path: string;
  size: number;
}

export interface SourceFile {
  path: string;
  content: string;
}

/** One dead-code finding. */
export interface DeadCodeGhost {
  type: 'unused-export' | 'unused-import' | 'empty-file';
  file: string;
  line: number;
  symbol: string;
  explanation: string;
}

/** One dead internal link in a Markdown file. */
export interface DeadLink {
  sourceFile: string;
  line: number;
  linkText: string;
  target: string;
  reason: string;
}

/** One deleted-code ghost from git history. */
export interface DeletedGhost {
  id: string;
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  file: string;
  code: string;
  /** Full unified diff of the commit, for the .patch download. */
  patch: string;
}

export interface ScanStats {
  filesScanned: number;
  filesSkipped: number;
  treeFiles: number;
  commitsScanned: number;
  commitsSkippedNoPatch: number;
}

export type ScanStatus =
  | 'idle'
  | 'loading-tree'
  | 'loading-files'
  | 'analyzing'
  | 'loading-history'
  | 'done'
  | 'error';

export class RepoGhostError extends Error {
  kind: 'not-found' | 'rate-limited' | 'network' | 'empty' | 'too-large';
  resetAt?: Date;
  constructor(kind: RepoGhostError['kind'], message: string, resetAt?: Date) {
    super(message);
    this.kind = kind;
    this.resetAt = resetAt;
  }
}
