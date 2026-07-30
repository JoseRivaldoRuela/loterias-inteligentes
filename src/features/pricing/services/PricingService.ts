import {
  BetPriceRepository,
  type BetPrice,
} from '@/infrastructure/repositories/BetPriceRepository'

export type CostCalculation = {
  betPrice: BetPrice
  ticketCount: number
  unitPrice: number
  totalCost: number
}

export const PricingService = {
  async getCurrentPrice(
    lotteryId: string,
    numbersPerBet: number,
  ): Promise<BetPrice | null> {
    if (!lotteryId || numbersPerBet <= 0) {
      return null
    }

    return BetPriceRepository.getCurrent(lotteryId, numbersPerBet)
  },

  calculateCost(
    betPrice: BetPrice,
    ticketCount: number,
  ): CostCalculation {
    const validTicketCount =
      Number.isInteger(ticketCount) && ticketCount > 0
        ? ticketCount
        : 0

    return {
      betPrice,
      ticketCount: validTicketCount,
      unitPrice: betPrice.price,
      totalCost: betPrice.price * validTicketCount,
    }
  },

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  },

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(
      new Date(`${value}T12:00:00`),
    )
  },

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  },
}