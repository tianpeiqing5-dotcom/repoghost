import type { DeadLink } from '../lib/types'

export default function DeadLinksList({ links }: { links: DeadLink[] }) {
  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-lg text-slate-300">🔗 All links lead somewhere.</p>
        <p className="mt-2 text-sm text-slate-500">
          No dead internal links found in the repo's Markdown files.
        </p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Source file</th>
            <th className="px-4 py-3 font-medium">Line</th>
            <th className="px-4 py-3 font-medium">Link</th>
            <th className="px-4 py-3 font-medium">Problem</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l, i) => (
            <tr
              key={`${l.sourceFile}:${l.line}:${l.target}`}
              className={i % 2 === 0 ? 'bg-slate-950/60' : 'bg-slate-900/40'}
            >
              <td className="px-4 py-2.5 font-mono text-xs text-slate-300 break-all">
                {l.sourceFile}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{l.line}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-sky-300 break-all">
                {l.linkText === '(reference)' ? l.target : `${l.linkText} → ${l.target}`}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-400">{l.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
