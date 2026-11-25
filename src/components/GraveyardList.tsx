import type { DeadCodeGhost } from '../lib/types'

const TYPE_LABEL: Record<DeadCodeGhost['type'], string> = {
  'unused-export': 'Unused export',
  'unused-import': 'Unused import',
  'empty-file': 'Empty file',
}

export default function GraveyardList({ ghosts }: { ghosts: DeadCodeGhost[] }) {
  if (ghosts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-lg text-slate-300">🎃 No ghosts here.</p>
        <p className="mt-2 text-sm text-slate-500">
          No unused exports, unused imports, or empty files were found. This
          repo is remarkably alive — or very well kept.
        </p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Line</th>
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Why it looks dead</th>
          </tr>
        </thead>
        <tbody>
          {ghosts.map((g, i) => (
            <tr
              key={`${g.file}:${g.line}:${g.symbol}`}
              className={i % 2 === 0 ? 'bg-slate-950/60' : 'bg-slate-900/40'}
            >
              <td className="px-4 py-2.5">
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-xs text-sky-300">
                  {TYPE_LABEL[g.type]}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-300 break-all">
                {g.file}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{g.line}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-amber-300">{g.symbol}</td>
              <td className="px-4 py-2.5 text-xs text-slate-400">{g.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
