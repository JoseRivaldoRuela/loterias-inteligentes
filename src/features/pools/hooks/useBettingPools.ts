import { useQuery } from '@tanstack/react-query'

import { BettingPoolRepository } from '@/infrastructure/repositories/BettingPoolRepository'

export function useBettingPools() {
  return useQuery({
    queryKey: ['betting-pools'],
    queryFn: () => BettingPoolRepository.listForUser(),
    staleTime: 60 * 1000,
  })
}
