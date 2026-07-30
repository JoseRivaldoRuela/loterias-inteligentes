import { supabase } from '@/infrastructure/supabase/client'

export type BetPrice = {
  id: string
  lotteryId: string
  numbersPerBet: number
  price: number
  currencyCode: string
  validFrom: string
  validUntil: string | null
  sourceName: string
  sourceUrl: string | null
  checkedAt: string
}

type BetPriceRow = {
  id: string
  lottery_id: string
  numbers_per_bet: number
  price: number | string
  currency_code: string
  valid_from: string
  valid_until: string | null
  source_name: string
  source_url: string | null
  checked_at: string
}

function mapBetPrice(row: BetPriceRow): BetPrice {
  return {
    id: row.id,
    lotteryId: row.lottery_id,
    numbersPerBet: row.numbers_per_bet,
    price: Number(row.price),
    currencyCode: row.currency_code,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    checkedAt: row.checked_at,
  }
}

export const BetPriceRepository = {
  async getCurrent(
    lotteryId: string,
    numbersPerBet: number,
  ): Promise<BetPrice | null> {
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('lottery_bet_prices')
      .select(`
        id,
        lottery_id,
        numbers_per_bet,
        price,
        currency_code,
        valid_from,
        valid_until,
        source_name,
        source_url,
        checked_at
      `)
      .eq('lottery_id', lotteryId)
      .eq('numbers_per_bet', numbersPerBet)
      .lte('valid_from', today)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Erro ao carregar preço da aposta: ${error.message}`)
    }

    return data ? mapBetPrice(data as BetPriceRow) : null
  },
}