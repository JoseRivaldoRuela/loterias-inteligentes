import type { Lottery } from '@/infrastructure/repositories/LotteryRepository'
import { LotteryResultsService } from '@/features/results/services/LotteryResultsService'

export type NumberStatistic = {
  number: number
  appearances: number
  frequency: number
  contestsSinceLastAppearance: number
  score: number
}

export type StatisticalSuggestion = {
  numbers: number[]
  drawCount: number
  firstContest: number
  lastContest: number
  statistics: NumberStatistic[]
}

export const StatisticalSuggestionService = {
  async suggest(
    lottery: Lottery,
    numberCount: number,
    startDate: string,
    endDate: string,
  ): Promise<StatisticalSuggestion> {
    if (!Number.isInteger(numberCount) || numberCount < lottery.minimumBet || numberCount > lottery.maximumBet) {
      throw new Error(`Escolha entre ${lottery.minimumBet} e ${lottery.maximumBet} dezenas.`)
    }

    const draws = await LotteryResultsService.findHistory(lottery.code, startDate, endDate)
    if (draws.length < 5) throw new Error('O período precisa conter pelo menos 5 concursos oficiais.')

    const raw = Array.from({ length: lottery.availableNumbers }, (_, index) => {
      const number = index + 1
      const appearances = draws.filter((draw) => draw.numbers.includes(number)).length
      const lastIndex = draws.findIndex((draw) => draw.numbers.includes(number))
      return {
        number,
        appearances,
        frequency: appearances / draws.length,
        contestsSinceLastAppearance: lastIndex < 0 ? draws.length : lastIndex,
      }
    })
    const maximumFrequency = Math.max(...raw.map((item) => item.frequency), 1)
    const maximumDelay = Math.max(...raw.map((item) => item.contestsSinceLastAppearance), 1)
    const statistics = raw.map((item) => ({
      ...item,
      // Frequência histórica domina; atraso recente atua apenas como desempate.
      score: (item.frequency / maximumFrequency) * 0.8
        + (item.contestsSinceLastAppearance / maximumDelay) * 0.2,
    })).sort((a, b) => b.score - a.score || b.appearances - a.appearances || a.number - b.number)

    return {
      numbers: statistics.slice(0, numberCount).map((item) => item.number).sort((a, b) => a - b),
      drawCount: draws.length,
      firstContest: draws.at(-1)!.contestNumber,
      lastContest: draws[0].contestNumber,
      statistics,
    }
  },
}
