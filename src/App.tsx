import { useCallback, useMemo, useState } from 'react'
import RepoForm from './components/RepoForm'
import Scoreboard from './components/Scoreboard'
import GraveyardList from './components/GraveyardList'
import DeadLinksList from './components/DeadLinksList'
import GhostCard from './components/GhostCard'
import ErrorBanner from './components/ErrorBanner'
import Ghost from './components/Ghost'
import {
  fetchSourceFiles,
  getDeletedGhosts,
  getRepo,
  getTree,
} from './lib/github'
import { analyzeDeadCode, analyzeDeadLinks } from './lib/analyzer'
import type {
  DeadCodeGhost,
  DeadLink,
  DeletedGhost,
  RepoGhostError,
  RepoMeta,
  ScanStatus,
  ScanStats,
} from './lib/types'
import { RepoGhostError as RGE } from './lib/types'

type Tab = 'graveyard' | 'links' | 'resurrect'

const STATUS_TEXT: Record<string, string> = {
  'loading-tree': 'Reading the repo tree…',
  'loading-files': 'Fetching source files…',
  'analyzing': 'Hunting ghosts…',
  'loading-history': 'Digging up the graveyard…',
}

export default function App() {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<RepoGhostError | null>(null)
  const [meta, setMeta] = useState<RepoMeta | null>(null)
  const [deadCode, setDeadCode] = useState<DeadCodeGhost[]>([])
  const [deadLinks, setDeadLinks] = useState<DeadLink[]>([])
  const [ghosts, setGhosts] = useState<DeletedGhost[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [tab, setTab] = useState<Tab>('graveyard')
  const [laidToRest, setLaidToRest] = useState<Set<string>>(new Set())

  const busy = status !== 'idle' && status !== 'done' && status !== 'error'

  const hunt = useCallback(async (owner: string, repo: string) => {
    setStatus('loading-tree')
    setError(null)
    setMeta(null)
    setDeadCode([])
    setDeadLinks([])
    setGhosts([])
    setStats(null)
    setLaidToRest(new Set())
    setTab('graveyard')
    try {
      const repoMeta = await getRepo({ owner, repo })
      setMeta(repoMeta)

      const { files: tree, truncated } = await getTree({ owner, repo }, repoMeta.defaultBranch)
      if (tree.length === 0) {
        throw new RGE('empty', 'This repo has no files in its tree.')
      }
      const treePaths = new Set(tree.map((f) => f.path))

      setStatus('loading-files')
      setProgress('')
      const { files, skipped } = await fetchSourceFiles(
        { owner, repo },
        repoMeta.defaultBranch,
        tree,
        (done, total) => setProgress(`Fetched ${done} of ${total} files…`),
      )
      if (files.length === 0) {
        throw new RGE(
          'empty',
          'No JS/TS, Python, or Markdown files found to scan in this repo.',
        )
      }

      setStatus('analyzing')
      const code = analyzeDeadCode(files)
      const links = analyzeDeadLinks(files, treePaths)

      setStatus('loading-history')
      const history = await getDeletedGhosts({ owner, repo })

      setDeadCode(code)
      setDeadLinks(links)
      setGhosts(history.ghosts)
      setStats({
        filesScanned: files.length,
        filesSkipped: skipped + (truncated ? tree.length : 0),
        treeFiles: tree.length,
        commitsScanned: history.commitsScanned,
        commitsSkippedNoPatch: history.commitsSkippedNoPatch,
      })
      setStatus('done')
    } catch (e) {
      if (e instanceof RGE) {
        setError(e)
      } else {
        setError(new RGE('network', 'Something went wrong while scanning. Please try again.'))
      }
      setStatus('error')
    }
  }, [])

  const totalFound = deadCode.length + deadLinks.length + ghosts.length

  const onResurrected = useCallback((id: string) => {
    setLaidToRest((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const tabs = useMemo(
    () => [
      { id: 'graveyard' as Tab, label: `🪦 Graveyard (${deadCode.length})` },
      { id: 'links' as Tab, label: `🔗 Dead links (${deadLinks.length})` },
      { id: 'resurrect' as Tab, label: `👻 Resurrect (${ghosts.length})` },
    ],
    [deadCode.length, deadLinks.length, ghosts.length],
  )

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <header className="border-b border-slate-800/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
          <div className="ghost-float">
            <Ghost className="h-11 w-11" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              Repo<span className="text-amber-300">Ghost</span>
            </h1>
            <p className="text-xs text-slate-500">
              Dead-code hunter · resurrect what your repo forgot
            </p>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="ml-auto hidden text-xs text-slate-500 hover:text-sky-300 sm:block"
          >
            Kiroween 2026 · Resurrection
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">
            Every repo has ghosts.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Paste a public GitHub repo and RepoGhost will find unused exports,
            unused imports, empty files, and dead links — then dig up deleted
            code from git history so you can bring it back.
          </p>
        </div>

        <div className="mt-8">
          <RepoForm onHunt={hunt} busy={busy} />
        </div>

        {busy && (
          <div className="mt-8 text-center">
            <p className="candle-flicker text-sm text-amber-300">
              {STATUS_TEXT[status] ?? 'Working…'}
            </p>
            {progress && <p className="mt-1 text-xs text-slate-500">{progress}</p>}
          </div>
        )}

        {error && (
          <div className="mt-8">
            <ErrorBanner error={error} />
          </div>
        )}

        {status === 'done' && meta && (
          <div className="mt-8">
            <Scoreboard found={totalFound} laidToRest={laidToRest.size} scanned={stats?.filesScanned ?? 0} />

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3 text-sm text-slate-300">
              <span className="font-mono text-sky-300">{meta.fullName}</span>
              <span className="text-slate-500"> · branch </span>
              <span className="font-mono">{meta.defaultBranch}</span>
              <span className="text-slate-500"> · ⭐ {meta.stars.toLocaleString()}</span>
              {meta.description && (
                <span className="mt-1 block text-xs text-slate-500">{meta.description}</span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    tab === t.id
                      ? 'bg-sky-400 text-slate-950'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === 'graveyard' && (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    Heuristic results — labeled “likely dead”. Dynamic imports,
                    reflection, and framework magic can hide real usage, so
                    check before deleting.
                  </p>
                  <GraveyardList ghosts={deadCode} />
                </>
              )}
              {tab === 'links' && <DeadLinksList links={deadLinks} />}
              {tab === 'resurrect' && (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    Deleted code from the last {stats?.commitsScanned ?? 0} commits
                    {stats && stats.commitsSkippedNoPatch > 0
                      ? ` (${stats.commitsSkippedNoPatch} commit(s) had diffs too large to read).`
                      : '.'}{' '}
                    Copy a ghost to resurrect it — or download the whole patch.
                  </p>
                  {ghosts.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                      <p className="text-lg text-slate-300">🕯️ The graveyard is empty.</p>
                      <p className="mt-2 text-sm text-slate-500">
                        No deleted code found in the recent commits.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {ghosts.map((g) => (
                        <GhostCard key={g.id} ghost={g} onResurrected={onResurrected} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {stats && (
              <p className="mt-6 text-center text-xs text-slate-600">
                Scanned {stats.filesScanned} files from a tree of {stats.treeFiles}
                {stats.filesSkipped > 0 ? ` · skipped ${stats.filesSkipped} (excluded, too large, or unreadable)` : ''} ·
                {stats.commitsScanned} commits checked.
              </p>
            )}
          </div>
        )}

        <footer className="mt-16 border-t border-slate-800/80 pt-6 text-center text-xs text-slate-600">
          <p>
            RepoGhost — Kiroween 2026 (Resurrection). Static app, no backend, no
            tracking. Results are heuristics; verify before deleting.
          </p>
          <p className="mt-1">
            Built with Vite + React + TypeScript + Tailwind. Apache-2.0.
          </p>
        </footer>
      </main>
    </div>
  )
}
