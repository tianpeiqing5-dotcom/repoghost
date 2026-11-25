import Ghost from './Ghost'

export default function Scoreboard({
  found,
  laidToRest,
  scanned,
}: {
  found: number
  laidToRest: number
  scanned: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-4">
      <div className="ghost-float">
        <Ghost className="w-12 h-12" />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-2xl font-bold text-slate-100">
          <span className="text-sky-300">{found}</span> ghosts found
          <span className="mx-2 text-slate-600">·</span>
          <span className="text-amber-300">{laidToRest}</span> laid to rest
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {scanned > 0
            ? `${scanned} files scanned. Resurrect a ghost to lay it to rest.`
            : 'Paste a repo above and start the hunt.'}
        </p>
      </div>
    </div>
  )
}
