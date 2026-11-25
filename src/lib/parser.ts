// Regex-based symbol extraction for JS/TS and Python.
// Deliberately heuristic: no AST, no type inference. Fast, deterministic,
// and honest about its limits — see the analyzer for how results are labeled.

export interface JsSymbols {
  /** export name -> line number of the definition */
  exports: Map<string, number>;
  /** imported name -> line number of the import */
  imports: Map<string, number>;
  /** line numbers that define an export (to exclude self-references) */
  exportLines: Set<number>;
}

const JS_EXPORT_RE =
  /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
const JS_EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;
const JS_IMPORT_BRACED_RE = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
const JS_IMPORT_DEFAULT_RE =
  /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"][^'"]+['"]/g;
const JS_IMPORT_NS_RE = /import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s*from\s*['"][^'"]+['"]/g;

/** Strip // and /* *\/ comments and string literals so symbol searches don't
 *  match words inside comments or strings. Kept intentionally simple. */
export function stripCommentsAndStrings(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

function lineOf(code: string, index: number): number {
  return code.slice(0, index).split('\n').length;
}

export function parseJsTs(code: string): JsSymbols {
  const exportsMap = new Map<string, number>();
  const importsMap = new Map<string, number>();
  const exportLines = new Set<number>();

  for (const m of code.matchAll(JS_EXPORT_RE)) {
    exportsMap.set(m[1], lineOf(code, m.index ?? 0));
    exportLines.add(lineOf(code, m.index ?? 0));
  }
  for (const m of code.matchAll(JS_EXPORT_LIST_RE)) {
    const line = lineOf(code, m.index ?? 0);
    for (const part of m[1].split(',')) {
      // `foo as bar` exports the local name `foo` under alias `bar`;
      // the alias is what other files import.
      const alias = part.trim().split(/\s+as\s+/);
      const name = (alias[1] ?? alias[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) {
        exportsMap.set(name, line);
        exportLines.add(line);
      }
    }
  }
  for (const m of code.matchAll(JS_IMPORT_BRACED_RE)) {
    const line = lineOf(code, m.index ?? 0);
    for (const part of m[1].split(',')) {
      const alias = part.trim().split(/\s+as\s+/);
      const name = (alias[1] ?? alias[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) importsMap.set(name, line);
    }
  }
  for (const m of code.matchAll(JS_IMPORT_DEFAULT_RE)) {
    importsMap.set(m[1], lineOf(code, m.index ?? 0));
  }
  for (const m of code.matchAll(JS_IMPORT_NS_RE)) {
    importsMap.set(m[1], lineOf(code, m.index ?? 0));
  }
  return { exports: exportsMap, imports: importsMap, exportLines };
}

export interface PySymbols {
  /** top-level def/class name -> line */
  defs: Map<string, number>;
  /** imported name -> line */
  imports: Map<string, number>;
}

const PY_IMPORT_RE = /^import\s+([A-Za-z_][\w.]*)(?:\s+as\s+([A-Za-z_]\w*))?/gm;
const PY_FROM_IMPORT_RE = /^from\s+[\w.]+\s+import\s+(.+)$/gm;
const PY_DEF_RE = /^(?:def|class)\s+([A-Za-z_]\w*)/gm;

export function parsePython(code: string): PySymbols {
  const defs = new Map<string, number>();
  const imports = new Map<string, number>();

  for (const m of code.matchAll(PY_IMPORT_RE)) {
    // `import a.b` binds `a`; `import x as y` binds `y`.
    const name = m[2] ?? m[1].split('.')[0];
    imports.set(name, lineOf(code, m.index ?? 0));
  }
  for (const m of code.matchAll(PY_FROM_IMPORT_RE)) {
    const line = lineOf(code, m.index ?? 0);
    // Parenthesized multi-imports span lines; this regex only sees the
    // first line, so multi-line from-imports are handled best-effort.
    for (const part of m[1].replace(/[()]/g, '').split(',')) {
      const alias = part.trim().split(/\s+as\s+/);
      const name = (alias[1] ?? alias[0]).trim();
      if (/^[A-Za-z_]\w*$/.test(name) && name !== '*') imports.set(name, line);
    }
  }
  for (const m of code.matchAll(PY_DEF_RE)) {
    defs.set(m[1], lineOf(code, m.index ?? 0));
  }
  return { defs, imports };
}

/** True when the file's only content is blank lines and comments. */
export function isCommentOnly(code: string, ext: string): boolean {
  const stripped =
    ext === 'py'
      ? code.replace(/#[^\n]*/g, ' ').replace(/'''[\s\S]*?'''/g, ' ').replace(/"""[\s\S]*?"""/g, ' ')
      : stripCommentsAndStrings(code);
  return stripped.trim().length === 0;
}

/** Word-boundary search for a symbol name in stripped code. */
export function containsWord(stripped: string, name: string): boolean {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return re.test(stripped);
}
