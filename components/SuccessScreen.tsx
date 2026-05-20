'use client'

export function SuccessScreen({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-800 px-10 py-10 shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-center text-lg font-semibold text-white">{message}</p>
      </div>
    </div>
  )
}
