import type { RepoGhostError } from '../lib/types'

export default function ErrorBanner({ error }: { error: RepoGhostError }) {
  const title =
    error.kind === 'not-found'
      ? 'Repo not found'
      : error.kind === 'rate-limited'
        ? 'GitHub rate limit'
        : error.kind === 'empty'
          ? 'Nothing to scan'
          : error.kind === 'too-large'
            ? 'Repo too large'
            : 'Something went wrong'
  return (
    <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-5 py-4">
      <p className="text-sm font-bold text-red-300">🪦 {title}</p>
      <p className="mt-1 text-sm text-red-200/80">{error.message}</p>
      {error.kind === 'rate-limited' && (
        <p className="mt-2 text-xs text-red-200/60">
          Unauthenticated GitHub requests are limited to 60/hour. RepoGhost
          only needs a few per scan, but the limit is shared with everything
          else your IP does on api.github.com.
        </p>
      )}
    </div>
  )
}
