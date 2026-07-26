import { supabase } from '@/infrastructure/supabase/client'

export type PrizeTier = {
  id: string
  lotteryId: string
  hits: number
  name: string
  displayOrder: number
  active: boolean
}

export type Lottery = {
  id: string
  code: string
  name: string
  availableNumbers: number
  drawnNumbers: number
  minimumBet: number
  maximumBet: number
  active: boolean
  configuration: Record<string, unknown>
  prizeTiers: PrizeTier[]
}

type LotteryRow = {
  id: string
  code: string
  name: string
  available_numbers: number
  drawn_numbers: number
  minimum_bet: number
  maximum_bet: number
  active: boolean
  configuration: Record<string, unknown> | null
  prize_tiers:
    | {
        id: string
        lottery_id: string
        hits: number
        name: string
        display_order: number
        active: boolean
      }[]
    | null
}

function mapLottery(row: LotteryRow): Lottery {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    availableNumbers: row.available_numbers,
    drawnNumbers: row.drawn_numbers,
    minimumBet: row.minimum_bet,
    maximumBet: row.maximum_bet,
    active: row.active,
    configuration: row.configuration ?? {},
    prizeTiers: (row.prize_tiers ?? [])
      .map((tier) => ({
        id: tier.id,
        lotteryId: tier.lottery_id,
        hits: tier.hits,
        name: tier.name,
        displayOrder: tier.display_order,
        active: tier.active,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }
}

export const LotteryRepository = {
  async getAll(): Promise<Lottery[]> {
    const { data, error } = await supabase
      .from('lotteries')
      .select(`
        id,
        code,
        name,
        available_numbers,
        drawn_numbers,
        minimum_bet,
        maximum_bet,
        active,
        configuration,
        prize_tiers (
          id,
          lottery_id,
          hits,
          name,
          display_order,
          active
        )
      `)
      .eq('active', true)
      .order('name')

    if (error) {
      throw new Error(`Erro ao carregar loterias: ${error.message}`)
    }

    return (data as LotteryRow[]).map(mapLottery)
  },

  async getByCode(code: string): Promise<Lottery | null> {
    const { data, error } = await supabase
      .from('lotteries')
      .select(`
        id,
        code,
        name,
        available_numbers,
        drawn_numbers,
        minimum_bet,
        maximum_bet,
        active,
        configuration,
        prize_tiers (
          id,
          lottery_id,
          hits,
          name,
          display_order,
          active
        )
      `)
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    if (error) {
      throw new Error(`Erro ao carregar loteria: ${error.message}`)
    }

    return data ? mapLottery(data as LotteryRow) : null
  },
}