'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/Spinner'
import { SuccessScreen } from '@/components/SuccessScreen'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/'), 1200)
  }

  return (
    <>
      <Spinner show={loading} />
      <SuccessScreen show={success} message="Welcome back!" />

      <div className="mx-auto max-w-sm pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-white">
            Night<span className="text-indigo-400">bet</span>
          </h1>
          <p className="mt-1 text-slate-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-400 ring-1 ring-rose-500/30">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-4 py-3 text-white placeholder-slate-500 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-4 py-3 text-white placeholder-slate-500 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          No account?{' '}
          <Link href="/auth/signup" className="text-indigo-400 hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </>
  )
}
