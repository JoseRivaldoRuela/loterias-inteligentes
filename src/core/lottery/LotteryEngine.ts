import type { LotteryConfig } from '@/core/lottery/LotteryConfig'

export type TicketValidationResult = {
  valid: boolean
  errors: string[]
}

export class LotteryEngine {
  static validateConfig(config: LotteryConfig): void {
    const errors: string[] = []

    if (!config.code.trim()) {
      errors.push('O código da loteria é obrigatório.')
    }

    if (!config.name.trim()) {
      errors.push('O nome da loteria é obrigatório.')
    }

    if (config.numberStart > config.numberEnd) {
      errors.push('A dezena inicial não pode ser maior que a final.')
    }

    const totalNumbers = config.numberEnd - config.numberStart + 1

    if (config.availableNumbers !== totalNumbers) {
      errors.push(
        'A quantidade de dezenas disponíveis não corresponde ao intervalo configurado.',
      )
    }

    if (config.drawnNumbers > config.availableNumbers) {
      errors.push(
        'A quantidade de dezenas sorteadas não pode superar as disponíveis.',
      )
    }

    if (config.minimumBet < config.drawnNumbers) {
      errors.push(
        'A aposta mínima não pode ter menos dezenas que o sorteio.',
      )
    }

    if (config.maximumBet < config.minimumBet) {
      errors.push(
        'A aposta máxima não pode ser menor que a aposta mínima.',
      )
    }

    if (config.maximumBet > config.availableNumbers) {
      errors.push(
        'A aposta máxima não pode superar as dezenas disponíveis.',
      )
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '))
    }
  }

  static getAvailableNumbers(config: LotteryConfig): number[] {
    this.validateConfig(config)

    return Array.from(
      { length: config.availableNumbers },
      (_, index) => config.numberStart + index,
    )
  }

  static validateTicket(
    config: LotteryConfig,
    numbers: number[],
  ): TicketValidationResult {
    const errors: string[] = []

    try {
      this.validateConfig(config)
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error
            ? error.message
            : 'Configuração de loteria inválida.',
        ],
      }
    }

    if (
      numbers.length < config.minimumBet ||
      numbers.length > config.maximumBet
    ) {
      errors.push(
        `O cartão deve possuir entre ${config.minimumBet} e ${config.maximumBet} dezenas.`,
      )
    }

    const uniqueNumbers = new Set(numbers)

    if (uniqueNumbers.size !== numbers.length) {
      errors.push('O cartão não pode conter dezenas repetidas.')
    }

    const invalidNumbers = numbers.filter(
      (number) =>
        !Number.isInteger(number) ||
        number < config.numberStart ||
        number > config.numberEnd,
    )

    if (invalidNumbers.length > 0) {
      errors.push(
        `Dezenas fora do intervalo permitido: ${invalidNumbers.join(', ')}.`,
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  static sortTicket(numbers: number[]): number[] {
    return [...numbers].sort((first, second) => first - second)
  }

  static countHits(ticket: number[], drawnNumbers: number[]): number {
    const drawSet = new Set(drawnNumbers)

    return ticket.reduce(
      (hits, number) => hits + (drawSet.has(number) ? 1 : 0),
      0,
    )
  }

  static findPrizeTier(config: LotteryConfig, hits: number) {
    return config.prizeTiers.find((tier) => tier.hits === hits) ?? null
  }
}