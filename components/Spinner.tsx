'use client'

export function Spinner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
    </div>
  )
}
