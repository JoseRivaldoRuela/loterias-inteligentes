import type { LotteryConfig } from '@/core/lottery/LotteryConfig'
import { LotteryEngine } from '@/core/lottery/LotteryEngine'

export type GeneratedTicket = {
  numbers: number[]
}

export type RandomGenerationOptions = {
  ticketCount: number
  numbersPerTicket: number
  allowDuplicateTickets?: boolean
}

export class RandomStrategy {
  static generate(
    config: LotteryConfig,
    options: RandomGenerationOptions,
  ): GeneratedTicket[] {
    LotteryEngine.validateConfig(config)

    const {
      ticketCount,
      numbersPerTicket,
      allowDuplicateTickets = false,
    } = options

    if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
      throw new Error('A quantidade de cartões deve ser maior que zero.')
    }

    if (
      numbersPerTicket < config.minimumBet ||
      numbersPerTicket > config.maximumBet
    ) {
      throw new Error(
        `Cada cartão deve possuir entre ${config.minimumBet} e ${config.maximumBet} dezenas.`,
      )
    }

    const availableNumbers = LotteryEngine.getAvailableNumbers(config)
    const tickets: GeneratedTicket[] = []
    const generatedKeys = new Set<string>()

    const maximumAttempts = Math.max(ticketCount * 100, 1000)
    let attempts = 0

    while (tickets.length < ticketCount) {
      attempts += 1

      if (attempts > maximumAttempts) {
        throw new Error(
          'Não foi possível gerar a quantidade solicitada de cartões únicos.',
        )
      }

      const shuffledNumbers = [...availableNumbers]

      for (
        let index = shuffledNumbers.length - 1;
        index > 0;
        index -= 1
      ) {
        const randomIndex = Math.floor(Math.random() * (index + 1))

        ;[shuffledNumbers[index], shuffledNumbers[randomIndex]] = [
          shuffledNumbers[randomIndex],
          shuffledNumbers[index],
        ]
      }

      const numbers = LotteryEngine.sortTicket(
        shuffledNumbers.slice(0, numbersPerTicket),
      )

      const validation = LotteryEngine.validateTicket(config, numbers)

      if (!validation.valid) {
        throw new Error(validation.errors.join(' '))
      }

      const ticketKey = numbers.join('-')

      if (!allowDuplicateTickets && generatedKeys.has(ticketKey)) {
        continue
      }

      generatedKeys.add(ticketKey)
      tickets.push({ numbers })
    }

    return tickets
  }
}