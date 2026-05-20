'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Market, Bet, Profile, getEffectiveStatus, formatDate, formatCoins } from '@/lib/types'
import { OddsBar } from '@/components/OddsBar'
import { BetForm } from '@/components/BetForm'
import { BetList } from '@/components/BetList'
import { SkeletonCard } from '@/components/SkeletonCard'

const STATUS_BADGE: Record<string, string> = {
  open:     'bg-emerald-500/20 text-emerald-400',
  closed:   'bg-amber-500/20 text-amber-400',
  resolved: 'bg-indigo-500/20 text-indigo-400',
  voided:   'bg-slate-600/40 text-slate-400',
}

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [market, setMarket] = useState<Market | null>(null)
  const [bets, setBets] = useState<Bet[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [marketRes, betsRes, userRes] = await Promise.all([
      supabase.from('markets').select('*, profiles!creator_id(*)').eq('id', id).single(),
      supabase.from('bets').select('*, profiles(username)').eq('market_id', id).order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ])

    if (marketRes.data) setMarket(marketRes.data)
    if (betsRes.data) setBets(betsRes.data)

    if (userRes.data.user) {
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userRes.data.user.id).single()
      if (prof) setProfile(prof)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel(`market-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'markets', filter: `id=eq.${id}`,
      }, fetchData)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'bets', filter: `market_id=eq.${id}`,
      }, fetchData)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
      }, fetchData)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [id, fetchData])

  async function handleDelete() {
    if (!confirm('Delete this market?')) return
    await supabase.from('markets').delete().eq('id', id)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">Market not found</p>
        <Link href="/" className="mt-2 block text-indigo-400 hover:underline">Back to markets</Link>
      </div>
    )
  }

  const status = getEffectiveStatus(market)
  const isCreator = profile?.id === market.creator_id
  const canBet = status === 'open'
  const canDelete = isCreator && bets.length === 0 && status === 'open'

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">← All markets</Link>
      </div>

      {/* Market header */}
      <div className="rounded-xl bg-slate-800 p-6 ring-1 ring-slate-700/50">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-slate-700/60 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            {market.category}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_BADGE[status]}`}>
            {status}
          </span>
        </div>

        <h1 className="mb-5 text-xl font-bold leading-snug text-white">{market.question}</h1>

        {status !== 'voided' && (
          <OddsBar yesPool={market.yes_pool} noPool={market.no_pool} />
        )}

        {status === 'resolved' && market.outcome && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-center font-semibold ${
            market.outcome === 'yes' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            Resolved: {market.outcome.toUpperCase()}
          </div>
        )}

        {status === 'voided' && (
          <div className="mt-4 rounded-lg bg-slate-700/40 px-4 py-3 text-center text-sm text-slate-400">
            This market was voided. All bets refunded.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-700/50 pt-4 text-xs text-slate-400">
          <span>Closes {formatDate(market.closes_at)}</span>
          <span>{bets.length} {bets.length === 1 ? 'bet' : 'bets'}</span>
          <span>Pool: {formatCoins(market.yes_pool + market.no_pool)} coins</span>
          {market.profiles && <span>By {market.profiles.username}</span>}
        </div>

        <div className="mt-3 flex gap-2">
          {canDelete && (
            <button
              onClick={handleDelete}
              className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20"
            >
              Delete market
            </button>
          )}
          {isCreator && status === 'closed' && (
            <Link
              href="/resolve"
              className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
            >
              Resolve this market →
            </Link>
          )}
        </div>
      </div>

      {/* Bet form */}
      {canBet && (
        <BetForm
          market={market}
          user={profile}
          onBetPlaced={fetchData}
        />
      )}

      {/* Bet list */}
      <div className="rounded-xl bg-slate-800 p-5 ring-1 ring-slate-700/50">
        <h2 className="mb-4 text-base font-semibold text-white">
          All Bets <span className="text-slate-400 font-normal text-sm">({bets.length})</span>
        </h2>
        <BetList bets={bets} />
      </div>
    </div>
  )
}
