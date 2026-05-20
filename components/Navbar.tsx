'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, formatCoins } from '@/lib/types'

export function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Load profile once on mount and when auth changes
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfile(null); setUserId(null); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => { subscription.unsubscribe() }
  }, [])

  // Separate effect for realtime — only runs when we have a userId
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`navbar-profile-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        setProfile(payload.new as Profile)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-white">Night<span className="text-indigo-400">bet</span></span>
        </Link>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 ring-1 ring-indigo-500/30">
                <span className="text-xs text-indigo-300">💰</span>
                <span className="text-sm font-bold text-indigo-300">{formatCoins(profile.balance)}</span>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Markets
                </Link>
                <Link
                  href="/markets/create"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  + Create
                </Link>
                <Link
                  href="/resolve"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Resolve
                </Link>
                <Link
                  href="/leaderboard"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Board
                </Link>
              </div>

              <button
                onClick={handleSignOut}
                className="rounded-lg bg-slate-700/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/leaderboard"
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Leaderboard
              </Link>
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
