'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Market, Profile, formatDate, formatCoins } from '@/lib/types'
import { OddsBar } from '@/components/OddsBar'
import { Spinner } from '@/components/Spinner'
import { SuccessScreen } from '@/components/SuccessScreen'

export default function ResolvePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [markets, setMarkets] = useState<(Market & { bet_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Trigger void check first
      await supabase.rpc('void_expired_markets')

      const [profRes, marketsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('markets')
          .select('*, bets(count)')
          .eq('creator_id', user.id)
          .in('status', ['open', 'closed'])
          .order('closes_at', { ascending: true }),
      ])

      if (profRes.data) setProfile(profRes.data)

      if (marketsRes.data) {
        const now = new Date()
        const closedMarkets = marketsRes.data
          .filter((m: Market) => new Date(m.closes_at) < now)
          .map((m: Market & { bets: { count: number }[] }) => ({
            ...m,
            bet_count: m.bets?.[0]?.count ?? 0,
          }))
        setMarkets(closedMarkets)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function handleResolve(marketId: string, outcome: 'yes' | 'no') {
    if (!profile) return
    setError((prev) => ({ ...prev, [marketId]: '' }))
    setResolving(true)

    const { data, error: rpcError } = await supabase.rpc('resolve_market', {
      p_market_id:   marketId,
      p_resolver_id: profile.id,
      p_outcome:     outcome,
    })

    setResolving(false)

    if (rpcError || data?.error) {
      setError((prev) => ({
        ...prev,
        [marketId]: rpcError?.message ?? data?.error ?? 'Resolution failed',
      }))
      return
    }

    setSuccessMsg(`Market resolved as ${outcome.toUpperCase()}!`)
    setTimeout(() => {
      setSuccessMsg('')
      setMarkets((prev) => prev.filter((m) => m.id !== marketId))
    }, 1400)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <>
      <Spinner show={resolving} />
      <SuccessScreen show={!!successMsg} message={successMsg} />

      <div>
        <h1 className="mb-2 text-2xl font-black text-white">Resolve Markets</h1>
        <p className="mb-6 text-sm text-slate-400">
          Markets you created that are past their closing time.
        </p>

        {markets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400">No markets to resolve right now.</p>
            <p className="mt-1 text-xs text-slate-500">
              Markets appear here after their closing time passes.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {markets.map((market) => (
              <div key={market.id} className="rounded-xl bg-slate-800 p-5 ring-1 ring-slate-700/50">
                <p className="mb-1 text-xs text-slate-400">{market.category}</p>
                <p className="mb-4 text-base font-semibold text-white">{market.question}</p>

                <div className="mb-4">
                  <OddsBar yesPool={market.yes_pool} noPool={market.no_pool} />
                </div>

                <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>Closed {formatDate(market.closes_at)}</span>
                  <span>{market.bet_count} bets</span>
                  <span>Total pool: {formatCoins(market.yes_pool + market.no_pool)} coins</span>
                </div>

                {error[market.id] && (
                  <p className="mb-3 text-sm text-rose-400">{error[market.id]}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleResolve(market.id, 'yes')}
                    disabled={resolving}
                    className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    Resolve YES
                  </button>
                  <button
                    onClick={() => handleResolve(market.id, 'no')}
                    disabled={resolving}
                    className="flex-1 rounded-lg bg-rose-500 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400 disabled:opacity-50"
                  >
                    Resolve NO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
