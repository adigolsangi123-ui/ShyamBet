'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Market, Profile, formatCoins } from '@/lib/types'
import { Spinner } from './Spinner'
import { SuccessScreen } from './SuccessScreen'

interface BetFormProps {
  market: Market
  user: Profile | null
  onBetPlaced: () => void
}

export function BetForm({ market, user, onBetPlaced }: BetFormProps) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="rounded-xl bg-slate-700/40 p-5 text-center">
        <p className="text-slate-400">
          <a href="/auth/login" className="text-indigo-400 hover:underline">Sign in</a> to place a bet
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amt = parseInt(amount, 10)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > user!.balance) { setError(`You only have ${formatCoins(user!.balance)} coins`); return }

    setLoading(true)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('place_bet', {
      p_user_id:   user!.id,
      p_market_id: market.id,
      p_side:      side,
      p_amount:    amt,
    })

    setLoading(false)

    if (rpcError || data?.error) {
      setError(rpcError?.message ?? data?.error ?? 'Failed to place bet')
      return
    }

    setAmount('')
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      onBetPlaced()
    }, 1400)
  }

  return (
    <>
      <Spinner show={loading} />
      <SuccessScreen show={success} message="Bet placed!" />

      <form onSubmit={handleSubmit} className="rounded-xl bg-slate-800 p-5 ring-1 ring-slate-700/50">
        <h3 className="mb-4 text-base font-semibold text-white">Place a Bet</h3>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>
        )}

        {/* Side selector */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('yes')}
            className={`rounded-lg py-2.5 text-sm font-bold transition ${
              side === 'yes'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => setSide('no')}
            className={`rounded-lg py-2.5 text-sm font-bold transition ${
              side === 'no'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            NO
          </button>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Amount (balance: {formatCoins(user.balance)} coins)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={user.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setAmount(String(user.balance))}
              className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-600"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="mb-4 flex gap-2">
          {[10, 50, 100, 250].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(Math.min(n, user.balance)))}
              className="flex-1 rounded-md bg-slate-700/60 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Bet {amount ? `${formatCoins(parseInt(amount, 10) || 0)} coins on ${side.toUpperCase()}` : 'now'}
        </button>
      </form>
    </>
  )
}
