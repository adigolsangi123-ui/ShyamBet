'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, formatCoins } from '@/lib/types'

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [profilesRes, userRes] = await Promise.all([
      supabase.from('profiles').select('*').order('balance', { ascending: false }),
      supabase.auth.getUser(),
    ])

    if (profilesRes.data) setProfiles(profilesRes.data)
    if (userRes.data.user) setCurrentUserId(userRes.data.user.id)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchData)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [fetchData])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <h1 className="mb-2 text-2xl font-black text-white">Leaderboard</h1>
      <p className="mb-6 text-sm text-slate-400">Live standings — updates as markets resolve</p>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <p className="py-16 text-center text-slate-400">No players yet.</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p, i) => {
            const isMe = p.id === currentUserId
            const rank = i + 1
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-4 ring-1 transition ${
                  isMe
                    ? 'bg-indigo-600/10 ring-indigo-500/40'
                    : 'bg-slate-800 ring-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-lg">
                    {rank <= 3 ? medals[rank - 1] : (
                      <span className="text-sm font-bold text-slate-400">#{rank}</span>
                    )}
                  </span>
                  <div>
                    <p className={`font-semibold ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                      {p.username}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-indigo-400">(you)</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    rank === 1 ? 'text-amber-400' : isMe ? 'text-indigo-300' : 'text-white'
                  }`}>
                    {formatCoins(p.balance)}
                  </p>
                  <p className="text-xs text-slate-500">coins</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
