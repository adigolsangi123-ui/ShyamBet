export type Profile = {
  id: string
  username: string
  email: string
  balance: number
  created_at: string
}

export type MarketStatus = 'open' | 'closed' | 'resolved' | 'voided'

export type Market = {
  id: string
  creator_id: string
  question: string
  category: string
  closes_at: string
  status: MarketStatus
  outcome: 'yes' | 'no' | null
  yes_pool: number
  no_pool: number
  created_at: string
  profiles?: Profile
  bets?: Bet[]
}

export type Bet = {
  id: string
  user_id: string
  market_id: string
  side: 'yes' | 'no'
  amount: number
  created_at: string
  profiles?: Profile
}

export function getEffectiveStatus(market: Pick<Market, 'status' | 'closes_at'>): MarketStatus {
  if (market.status === 'resolved' || market.status === 'voided') return market.status
  if (new Date(market.closes_at) < new Date()) return 'closed'
  return 'open'
}

export function getYesPct(market: Pick<Market, 'yes_pool' | 'no_pool'>): number {
  const total = market.yes_pool + market.no_pool
  return Math.round((market.yes_pool / total) * 100)
}

export function formatCoins(n: number): string {
  return n.toLocaleString()
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const GLOBAL_DEADLINE = new Date('2026-05-24T02:00:00Z')
export const GLOBAL_DEADLINE_ISO = '2026-05-24T02:00:00'
