import { Bet, formatCoins } from '@/lib/types'

export function BetList({ bets }: { bets: Bet[] }) {
  if (bets.length === 0) {
    return <p className="text-center py-8 text-slate-400">No bets placed yet. Be the first!</p>
  }

  return (
    <div className="space-y-2">
      {bets.map((bet) => (
        <div
          key={bet.id}
          className="flex items-center justify-between rounded-lg bg-slate-700/50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-6 w-12 items-center justify-center rounded-full text-xs font-bold uppercase ${
                bet.side === 'yes'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {bet.side}
            </span>
            <span className="text-sm text-slate-300">
              {bet.profiles?.username ?? 'Unknown'}
            </span>
          </div>
          <span className="text-sm font-semibold text-white">
            {formatCoins(bet.amount)} coins
          </span>
        </div>
      ))}
    </div>
  )
}
