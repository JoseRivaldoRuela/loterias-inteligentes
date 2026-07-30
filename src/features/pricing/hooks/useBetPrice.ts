import { useQuery } from '@tanstack/react-query'

import { PricingService } from '@/features/pricing/services/PricingService'

export const betPriceQueryKeys = {
  all: ['bet-prices'] as const,

  current: (lotteryId: string, numbersPerBet: number) =>
    [
      ...betPriceQueryKeys.all,
      'current',
      lotteryId,
      numbersPerBet,
    ] as const,
}

export function useBetPrice(
  lotteryId: string,
  numbersPerBet: number,
) {
  return useQuery({
    queryKey: betPriceQueryKeys.current(
      lotteryId,
      numbersPerBet,
    ),

    queryFn: () =>
      PricingService.getCurrentPrice(
        lotteryId,
        numbersPerBet,
      ),

    enabled: Boolean(lotteryId) && numbersPerBet > 0,

    staleTime: 30 * 60 * 1000,
  })
}