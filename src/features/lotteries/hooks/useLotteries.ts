import { useQuery } from '@tanstack/react-query'

import { LotteryService } from '@/features/lotteries/services/LotteryService'

export const lotteryQueryKeys = {
  all: ['lotteries'] as const,
  active: () => [...lotteryQueryKeys.all, 'active'] as const,
}

export function useLotteries() {
  return useQuery({
    queryKey: lotteryQueryKeys.active(),
    queryFn: () => LotteryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })
}