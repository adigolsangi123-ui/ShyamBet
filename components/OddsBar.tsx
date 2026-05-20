import { getYesPct } from '@/lib/types'

interface OddsBarProps {
  yesPool: number
  noPool: number
  size?: 'sm' | 'md'
}

export function OddsBar({ yesPool, noPool, size = 'md' }: OddsBarProps) {
  const yesPct = getYesPct({ yes_pool: yesPool, no_pool: noPool })
  const noPct = 100 - yesPct
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div>
      <div className={`flex w-full overflow-hidden rounded-full ${h} bg-slate-700`}>
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-rose-500 transition-all duration-500"
          style={{ width: `${noPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-medium">
        <span className="text-emerald-400">YES {yesPct}%</span>
        <span className="text-rose-400">NO {noPct}%</span>
      </div>
    </div>
  )
}
