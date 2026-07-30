import type { LotteryConfig } from '@/core/lottery/LotteryConfig'
import { LotteryEngine } from '@/core/lottery/LotteryEngine'

export type GeneratedTicket = {
  numbers: number[]
}

export type RandomGenerationOptions = {
  ticketCount: number
  numbersPerTicket: number
  selectedNumbers: number[]
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
      selectedNumbers,
      allowDuplicateTickets = false,
    } = options

    if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
      throw new Error(
        'A quantidade de cartões deve ser um número inteiro maior que zero.',
      )
    }

    if (
      !Number.isInteger(numbersPerTicket) ||
      numbersPerTicket < config.minimumBet ||
      numbersPerTicket > config.maximumBet
    ) {
      throw new Error(
        `Cada cartão deve possuir entre ${config.minimumBet} e ${config.maximumBet} dezenas.`,
      )
    }

    this.validateSelectedNumbers(config, selectedNumbers)

    if (selectedNumbers.length < numbersPerTicket) {
      throw new Error(
        `Foram selecionadas ${selectedNumbers.length} dezenas, mas cada cartão precisa de ${numbersPerTicket}.`,
      )
    }

    const possibleCombinations = this.calculateCombinations(
      selectedNumbers.length,
      numbersPerTicket,
    )

    if (!allowDuplicateTickets && ticketCount > possibleCombinations) {
      throw new Error(
        `Com ${selectedNumbers.length} dezenas, existem somente ${possibleCombinations} combinações únicas de ${numbersPerTicket} dezenas.`,
      )
    }

    const sequencePosition = new Map(
      selectedNumbers.map((number, index) => [number, index]),
    )

    const tickets: GeneratedTicket[] = []
    const generatedKeys = new Set<string>()

    const maximumAttempts = Math.max(ticketCount * 500, 5000)
    let attempts = 0

    while (tickets.length < ticketCount) {
      attempts += 1

      if (attempts > maximumAttempts) {
        throw new Error(
          'Não foi possível gerar a quantidade solicitada de cartões únicos.',
        )
      }

      const selectedTicketNumbers = this.selectRandomNumbers(
        selectedNumbers,
        numbersPerTicket,
      )

      const canonicalKey = [...selectedTicketNumbers]
        .sort((first, second) => first - second)
        .join('-')

      if (!allowDuplicateTickets && generatedKeys.has(canonicalKey)) {
        continue
      }

      const orderedNumbers = [...selectedTicketNumbers].sort(
        (first, second) =>
          (sequencePosition.get(first) ?? 0) -
          (sequencePosition.get(second) ?? 0),
      )

      const validation = LotteryEngine.validateTicket(
        config,
        orderedNumbers,
      )

      if (!validation.valid) {
        throw new Error(validation.errors.join(' '))
      }

      generatedKeys.add(canonicalKey)

      tickets.push({
        numbers: orderedNumbers,
      })
    }

    return tickets
  }

  private static validateSelectedNumbers(
    config: LotteryConfig,
    numbers: number[],
  ): void {
    if (numbers.length === 0) {
      throw new Error('Selecione pelo menos uma dezena.')
    }

    const uniqueNumbers = new Set(numbers)

    if (uniqueNumbers.size !== numbers.length) {
      throw new Error('A sequência contém dezenas repetidas.')
    }

    const invalidNumbers = numbers.filter(
      (number) =>
        !Number.isInteger(number) ||
        number < config.numberStart ||
        number > config.numberEnd,
    )

    if (invalidNumbers.length > 0) {
      throw new Error(
        `Dezenas inválidas na sequência: ${invalidNumbers.join(', ')}.`,
      )
    }
  }

  private static selectRandomNumbers(
    sequence: number[],
    numbersPerTicket: number,
  ): number[] {
    const shuffledNumbers = [...sequence]

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

    return shuffledNumbers.slice(0, numbersPerTicket)
  }

  private static calculateCombinations(
    totalNumbers: number,
    selectedNumbers: number,
  ): number {
    const smallerSelection = Math.min(
      selectedNumbers,
      totalNumbers - selectedNumbers,
    )

    let result = 1

    for (let index = 1; index <= smallerSelection; index += 1) {
      result =
        (result * (totalNumbers - smallerSelection + index)) / index

      if (result >= Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER
      }
    }

    return Math.round(result)
  }
}