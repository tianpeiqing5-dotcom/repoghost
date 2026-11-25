import { useState } from 'react'
import type { DeletedGhost } from '../lib/types'
import { copyToClipboard, downloadTextFile } from '../lib/graveyard'

export default function GhostCard({
  ghost,
  onResurrected,
}: {
  ghost: DeletedGhost
  onResurrected: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const resurrect = async () => {
    const ok = await copyToClipboard(ghost.code)
    if (ok) {
      setCopied(true)
      onResurrected(ghost.id)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadPatch = () => {
    downloadTextFile(`resurrect-${ghost.shortSha}.patch`, ghost.patch)
    setDownloaded(true)
    onResurrected(ghost.id)
    window.setTimeout(() => setDownloaded(false), 2000)
  }

  const date = ghost.date ? new Date(ghost.date).toLocaleDateString() : ''

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-sky-300">{ghost.shortSha}</span>
        <span className="text-sm font-medium text-slate-200">{ghost.message || '(no message)'}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {ghost.author} · {date} · <span className="font-mono">{ghost.file}</span>
      </p>
      <pre className="code-scroll mt-3 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
        {ghost.code}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={resurrect}
          className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
        >
          {copied ? '✓ Copied!' : '👻 Resurrect (copy code)'}
        </button>
        <button
          onClick={downloadPatch}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400"
        >
          {downloaded ? '✓ Downloaded!' : 'Download .patch'}
        </button>
      </div>
    </article>
  )
}
