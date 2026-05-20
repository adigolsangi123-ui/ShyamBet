import Link from 'next/link'
import { Market, getEffectiveStatus, formatDate } from '@/lib/types'
import { OddsBar } from './OddsBar'

const STATUS_BADGE: Record<string, string> = {
  open:     'bg-emerald-500/20 text-emerald-400',
  closed:   'bg-amber-500/20 text-amber-400',
  resolved: 'bg-indigo-500/20 text-indigo-400',
  voided:   'bg-slate-600/40 text-slate-400',
}

export function MarketCard({ market, betCount }: { market: Market; betCount?: number }) {
  const status = getEffectiveStatus(market)

  return (
    <Link
      href={`/markets/${market.id}`}
      className="block rounded-xl bg-slate-800 p-5 ring-1 ring-slate-700/50 transition hover:ring-indigo-500/40 hover:bg-slate-800/80"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-700/60 px-2.5 py-0.5 text-xs font-medium text-slate-300">
          {market.category}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
          {status}
        </span>
      </div>

      <p className="mb-4 text-base font-semibold leading-snug text-white line-clamp-2">
        {market.question}
      </p>

      {status !== 'voided' && (
        <div className="mb-3">
          <OddsBar yesPool={market.yes_pool} noPool={market.no_pool} />
        </div>
      )}

      {status === 'resolved' && market.outcome && (
        <p className="mb-3 text-sm font-medium">
          Resolved:{' '}
          <span className={market.outcome === 'yes' ? 'text-emerald-400' : 'text-rose-400'}>
            {market.outcome.toUpperCase()}
          </span>
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Closes {formatDate(market.closes_at)}</span>
        {betCount !== undefined && (
          <span>{betCount} {betCount === 1 ? 'bet' : 'bets'}</span>
        )}
      </div>
    </Link>
  )
}
