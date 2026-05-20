'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Market, getEffectiveStatus } from '@/lib/types'
import { MarketCard } from '@/components/MarketCard'
import { SkeletonList } from '@/components/SkeletonCard'
import Link from 'next/link'

type Filter = 'all' | 'open' | 'closed' | 'resolved'

const FILTERS: Filter[] = ['all', 'open', 'closed', 'resolved']

export default function HomePage() {
  const [markets, setMarkets] = useState<(Market & { bet_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const supabase = createClient()

  const fetchMarkets = useCallback(async () => {
    const { data } = await supabase
      .from('markets')
      .select('*, bets(count)')
      .order('created_at', { ascending: false })

    if (data) {
      const enriched = data.map((m: Market & { bets: { count: number }[] }) => ({
        ...m,
        bet_count: m.bets?.[0]?.count ?? 0,
      }))
      setMarkets(enriched)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Trigger void check
    supabase.rpc('void_expired_markets').then(() => fetchMarkets())

    const channel = supabase
      .channel('home-markets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, fetchMarkets)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, fetchMarkets)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [fetchMarkets])

  const filtered = markets.filter((m) => {
    if (filter === 'all') return true
    return getEffectiveStatus(m) === filter
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Markets</h1>
          <p className="text-sm text-slate-400">Ends 2am May 24, 2026</p>
        </div>
        <Link
          href="/markets/create"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          + Create
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-800/60 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400">No {filter === 'all' ? '' : filter} markets yet.</p>
          {filter === 'open' && (
            <Link href="/markets/create" className="mt-2 block text-indigo-400 hover:underline">
              Be the first to create one
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} betCount={market.bet_count} />
          ))}
        </div>
      )}
    </div>
  )
}
