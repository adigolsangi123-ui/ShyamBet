'use client'

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-slate-800 p-5 animate-pulse">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-slate-700" />
        <div className="h-4 w-16 rounded bg-slate-700" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-5 w-full rounded bg-slate-700" />
        <div className="h-5 w-3/4 rounded bg-slate-700" />
      </div>
      <div className="mb-2 h-2 w-full rounded-full bg-slate-700" />
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded bg-slate-700" />
        <div className="h-4 w-16 rounded bg-slate-700" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
