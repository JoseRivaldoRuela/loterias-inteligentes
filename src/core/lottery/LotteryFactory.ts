import type { Lottery } from '@/infrastructure/repositories/LotteryRepository'
import type { LotteryConfig } from '@/core/lottery/LotteryConfig'

export class LotteryFactory {
  static create(lottery: Lottery): LotteryConfig {
    return {
      id: lottery.id,
      code: lottery.code,
      name: lottery.name,
      availableNumbers: lottery.availableNumbers,
      drawnNumbers: lottery.drawnNumbers,
      minimumBet: lottery.minimumBet,
      maximumBet: lottery.maximumBet,
      numberStart: Number(lottery.configuration.numberStart ?? 1),
      numberEnd: Number(
        lottery.configuration.numberEnd ?? lottery.availableNumbers,
      ),
      prizeTiers: lottery.prizeTiers.map((tier) => ({
        hits: tier.hits,
        name: tier.name,
      })),
      configuration: lottery.configuration,
    }
  }
}