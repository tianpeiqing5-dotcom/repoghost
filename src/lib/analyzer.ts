// Dead-code + dead-link analysis over fetched source files.
// Everything here is heuristic: results are "likely dead", never certain.

import type { DeadCodeGhost, DeadLink, SourceFile } from './types';
import { containsWord, isCommentOnly, parseJsTs, parsePython, stripCommentsAndStrings } from './parser';

const JS_EXT = /\.(js|jsx|ts|tsx|mjs|cjs)$/i;
const PY_EXT = /\.py$/i;
const MD_EXT = /\.md$/i;

const ENTRY_BASENAME = /^(index|main|app|cli|server|setup)\.[jt]sx?$/i;
const CONFIG_FILE = /\.config\.[jt]sx?$/i;

/** Count how many times `name` appears across all files' stripped bodies. */
function usageCount(
  strippedByPath: Map<string, string>,
  name: string,
  excludePath?: string,
): number {
  let n = 0;
  for (const [path, body] of strippedByPath) {
    if (path === excludePath) continue;
    if (containsWord(body, name)) n += 1;
  }
  return n;
}

export function analyzeDeadCode(files: SourceFile[]): DeadCodeGhost[] {
  const ghosts: DeadCodeGhost[] = [];

  const jsFiles = files.filter((f) => JS_EXT.test(f.path));
  const pyFiles = files.filter((f) => PY_EXT.test(f.path));

  // Stripped bodies, used for cross-file reference searches.
  const jsStripped = new Map<string, string>();
  for (const f of jsFiles) jsStripped.set(f.path, stripCommentsAndStrings(f.content));
  const pyStripped = new Map<string, string>();
  for (const f of pyFiles) pyStripped.set(f.path, f.content.replace(/#[^\n]*/g, ' '));

  // --- JS/TS: unused exports + unused imports ---
  for (const f of jsFiles) {
    const base = f.path.split('/').pop() ?? f.path;
    const isEntry = ENTRY_BASENAME.test(base) || CONFIG_FILE.test(base);
    const syms = parseJsTs(f.content);
    const ownBody = jsStripped.get(f.path) ?? '';

    for (const [name, line] of syms.exports) {
      if (isEntry) continue; // entry points are reachable by convention
      // Used if referenced in any other file, or more than once in its own
      // file (definition + at least one real use).
      const elsewhere = usageCount(jsStripped, name, f.path);
      const ownUses = (ownBody.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (elsewhere === 0 && ownUses <= 1) {
        ghosts.push({
          type: 'unused-export',
          file: f.path,
          line,
          symbol: name,
          explanation: `Exported but never imported or referenced anywhere else in the repo.`,
        });
      }
    }

    for (const [name, line] of syms.imports) {
      const uses = (ownBody.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (uses <= 1) {
        // Only the import statement itself mentions it.
        ghosts.push({
          type: 'unused-import',
          file: f.path,
          line,
          symbol: name,
          explanation: `Imported but never used in this file.`,
        });
      }
    }
  }

  // --- Python: unused top-level defs + unused imports ---
  for (const f of pyFiles) {
    const base = f.path.split('/').pop() ?? f.path;
    if (base === '__init__.py' || base === '__main__.py' || base === 'setup.py') continue;
    const syms = parsePython(f.content);
    const ownBody = pyStripped.get(f.path) ?? '';

    for (const [name, line] of syms.defs) {
      const elsewhere = usageCount(pyStripped, name, f.path);
      const ownUses = (ownBody.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (elsewhere === 0 && ownUses <= 1) {
        ghosts.push({
          type: 'unused-export',
          file: f.path,
          line,
          symbol: name,
          explanation: `Top-level def/class never referenced in any other Python file.`,
        });
      }
    }
    for (const [name, line] of syms.imports) {
      const uses = (ownBody.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
      if (uses <= 1) {
        ghosts.push({
          type: 'unused-import',
          file: f.path,
          line,
          symbol: name,
          explanation: `Imported but never used in this file.`,
        });
      }
    }
  }

  // --- Empty / comment-only files ---
  for (const f of files) {
    if (!JS_EXT.test(f.path) && !PY_EXT.test(f.path)) continue;
    const ext = PY_EXT.test(f.path) ? 'py' : 'js';
    if (f.content.trim().length === 0 || isCommentOnly(f.content, ext)) {
      ghosts.push({
        type: 'empty-file',
        file: f.path,
        line: 1,
        symbol: f.path.split('/').pop() ?? f.path,
        explanation: `File is empty or contains only comments.`,
      });
    }
  }

  return ghosts.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

// --- Dead links in Markdown ---

const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const REF_DEF_RE = /^\[[^\]]+\]:\s*(\S+)/gm;

/** GitHub-style heading slug: lowercase, spaces → '-', strip punctuation. */
export function slugify(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function headingsOf(md: string): Set<string> {
  const set = new Set<string>();
  for (const line of md.split('\n')) {
    const m = line.match(/^#{1,6}\s+(.*)$/);
    if (m) set.add(slugify(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')));
  }
  return set;
}

/** Resolve a relative link target against the source file's directory. */
function resolveRelative(fromFile: string, target: string): string | null {
  if (/^(https?:|mailto:|tel:|#)/i.test(target)) return null; // external or anchor-only
  const [pathPart] = target.split('#');
  if (!pathPart) return null; // anchor-only link, handled by caller
  const dir = fromFile.split('/').slice(0, -1);
  const parts: string[] = [];
  for (const seg of [...dir, ...pathPart.split('/')]) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function analyzeDeadLinks(files: SourceFile[], treePaths: Set<string>): DeadLink[] {
  const dead: DeadLink[] = [];
  const mdFiles = files.filter((f) => MD_EXT.test(f.path));
  const mdByPath = new Map(mdFiles.map((f) => [f.path, f.content]));

  for (const f of mdFiles) {
    const ownHeadings = headingsOf(f.content);
    const lines = f.content.split('\n');
    const targets: Array<{ target: string; text: string; line: number }> = [];

    for (const m of f.content.matchAll(LINK_RE)) {
      const line = f.content.slice(0, m.index ?? 0).split('\n').length;
      targets.push({ target: m[2], text: m[1], line });
    }
    for (const m of f.content.matchAll(REF_DEF_RE)) {
      const line = f.content.slice(0, m.index ?? 0).split('\n').length;
      targets.push({ target: m[1], text: '(reference)', line });
    }

    for (const { target, text, line } of targets) {
      if (/^(https?:|mailto:|tel:)/i.test(target)) continue; // external
      if (target.startsWith('#')) {
        // Anchor inside the same file.
        if (!ownHeadings.has(slugify(decodeURIComponent(target.slice(1))))) {
          dead.push({
            sourceFile: f.path,
            line,
            linkText: text,
            target,
            reason: `Anchor "#${target.slice(1)}" has no matching heading in this file.`,
          });
        }
        continue;
      }
      const [pathPart, anchor] = target.split('#');
      const resolved = resolveRelative(f.path, pathPart);
      if (resolved === null) continue;
      if (!treePaths.has(resolved)) {
        dead.push({
          sourceFile: f.path,
          line,
          linkText: text,
          target,
          reason: `File "${resolved}" does not exist in the repo.`,
        });
      } else if (anchor && MD_EXT.test(resolved)) {
        const targetHeadings = headingsOf(mdByPath.get(resolved) ?? '');
        if (!targetHeadings.has(slugify(decodeURIComponent(anchor)))) {
          dead.push({
            sourceFile: f.path,
            line,
            linkText: text,
            target,
            reason: `Anchor "#${anchor}" has no matching heading in "${resolved}".`,
          });
        }
      }
    }
    // Keep `lines` referenced for future line-precise work; currently the
    // line is computed from the match index above.
    void lines;
  }

  return dead.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.line - b.line);
}
