'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, GLOBAL_DEADLINE_ISO } from '@/lib/types'
import { Spinner } from '@/components/Spinner'
import { SuccessScreen } from '@/components/SuccessScreen'

const CATEGORIES = ['Politics', 'Sports', 'Entertainment', 'Tech', 'Science', 'Social', 'Finance', 'Other']

export default function CreateMarketPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const finalCategory = category === 'Other' ? customCategory.trim() : category
    if (!finalCategory) { setError('Pick a category'); return }
    if (!question.trim()) { setError('Enter a question'); return }
    if (!closesAt) { setError('Set a closing time'); return }

    const closesDate = new Date(closesAt)
    const deadline = new Date(GLOBAL_DEADLINE_ISO)
    if (closesDate > deadline) {
      setError('Closing time cannot be after 2am May 24, 2026')
      return
    }
    if (closesDate <= new Date()) {
      setError('Closing time must be in the future')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: insertError } = await supabase.from('markets').insert({
      creator_id: profile!.id,
      question:   question.trim(),
      category:   finalCategory,
      closes_at:  closesDate.toISOString(),
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/'), 1400)
  }

  if (!profile) return null

  return (
    <>
      <Spinner show={loading} />
      <SuccessScreen show={success} message="Market created!" />

      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-black text-white">Create Market</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-400 ring-1 ring-rose-500/30">
              {error}
            </div>
          )}

          {/* Question */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Question <span className="text-slate-500">(YES/NO)</span>
            </label>
            <textarea
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-lg bg-slate-800 px-4 py-3 text-white placeholder-slate-500 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Will the DJ play after midnight?"
            />
            <p className="mt-1 text-right text-xs text-slate-500">{question.length}/200</p>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    category === c
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {category === 'Other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Custom category"
                maxLength={40}
              />
            )}
          </div>

          {/* Closing time */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Closing time <span className="text-slate-500">(max 2am May 24)</span>
            </label>
            <input
              type="datetime-local"
              required
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              max={GLOBAL_DEADLINE_ISO}
              className="w-full rounded-lg bg-slate-800 px-4 py-3 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Create market
          </button>
        </form>
      </div>
    </>
  )
}
