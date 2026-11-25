import { useState } from 'react'
import { parseRepoRef } from '../lib/github'

const SAMPLES = ['facebook/react', 'vuejs/vue', 'sindresorhus/awesome', 'microsoft/vscode']

export default function RepoForm({
  onHunt,
  busy,
}: {
  onHunt: (owner: string, repo: string) => void
  busy: boolean
}) {
  const [value, setValue] = useState('')
  const [hint, setHint] = useState('')

  const submit = () => {
    const ref = parseRepoRef(value)
    if (!ref) {
      setHint('Enter a public repo as owner/repo or a github.com URL.')
      return
    }
    setHint('')
    onHunt(ref.owner, ref.repo)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Paste a public GitHub repo URL — e.g. facebook/react"
          className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          disabled={busy}
        />
        <button
          onClick={submit}
          disabled={busy}
          className="shrink-0 rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-wait"
        >
          {busy ? 'Hunting…' : '👻 Hunt'}
        </button>
      </div>
      {hint && <p className="mt-2 text-xs text-amber-300">{hint}</p>}
      <p className="mt-3 text-xs text-slate-500">
        No sign-in, no backend — RepoGhost reads the public GitHub API only.
        Try one:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setValue(s)
              const [owner, repo] = s.split('/')
              onHunt(owner, repo)
            }}
            disabled={busy}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-sky-300 hover:border-sky-400 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
