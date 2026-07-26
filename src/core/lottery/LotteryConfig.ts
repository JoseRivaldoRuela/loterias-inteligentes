export interface PrizeTierConfig {
  hits: number
  name: string
}

export interface LotteryConfig {

  id: string

  code: string

  name: string

  availableNumbers: number

  drawnNumbers: number

  minimumBet: number

  maximumBet: number

  numberStart: number

  numberEnd: number

  prizeTiers: PrizeTierConfig[]

  configuration: Record<string, unknown>
}