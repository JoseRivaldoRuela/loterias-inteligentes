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
  games: number[][]
  drawCount: number
  firstContest: number
  lastContest: number
  firstDrawDate: string
  lastDrawDate: string
  statistics: NumberStatistic[]
}

export const StatisticalSuggestionService = {
  async suggest(
    lottery: Lottery,
    numberCount: number,
    startDate: string,
    endDate: string,
    previousSuggestions: number[][] = [],
    gameCount = 1,
  ): Promise<StatisticalSuggestion> {
    if (!Number.isInteger(numberCount) || numberCount < lottery.minimumBet || numberCount > lottery.maximumBet) {
      throw new Error(`Escolha entre ${lottery.minimumBet} e ${lottery.maximumBet} dezenas.`)
    }
    if (!Number.isInteger(gameCount) || gameCount < 1 || gameCount > 20) {
      throw new Error('Escolha entre 1 e 20 jogos por sugestão.')
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

    const rollingHistory = [...previousSuggestions]
    const games: number[][] = []
    for (let gameIndex = 0; gameIndex < gameCount; gameIndex += 1) {
      const recentUsage = new Map<number, number>()
      rollingHistory.slice(-3).forEach((suggestion, suggestionIndex, recent) => {
        const weight = (suggestionIndex + 1) / recent.length
        suggestion.forEach((number) => recentUsage.set(number, (recentUsage.get(number) ?? 0) + weight))
      })
      const jitter = new Map(statistics.map((item) => [item.number, Math.random() * 0.04]))
      const diversifiedRanking = [...statistics].sort((a, b) => {
        const adjustedA = a.score - (recentUsage.get(a.number) ?? 0) * 0.18 + jitter.get(a.number)!
        const adjustedB = b.score - (recentUsage.get(b.number) ?? 0) * 0.18 + jitter.get(b.number)!
        return adjustedB - adjustedA || b.score - a.score || a.number - b.number
      })

      const lastSuggestion = new Set(rollingHistory.at(-1) ?? [])
      const unavoidableOverlap = Math.max(0, numberCount + lastSuggestion.size - lottery.availableNumbers)
      const overlapLimit = Math.max(unavoidableOverlap, Math.floor(numberCount * 0.25))
      const selected: number[] = []
      let overlap = 0
      for (const statistic of diversifiedRanking) {
        const repeated = lastSuggestion.has(statistic.number)
        if (repeated && overlap >= overlapLimit) continue
        selected.push(statistic.number)
        if (repeated) overlap += 1
        if (selected.length === numberCount) break
      }
      const game = selected.sort((a, b) => a - b)
      games.push(game)
      rollingHistory.push(game)
    }

    return {
      numbers: games[0],
      games,
      drawCount: draws.length,
      firstContest: draws.at(-1)!.contestNumber,
      lastContest: draws[0].contestNumber,
      firstDrawDate: draws.at(-1)!.drawDate,
      lastDrawDate: draws[0].drawDate,
      statistics,
    }
  },
}
