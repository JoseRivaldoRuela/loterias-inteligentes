import { useQuery } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useSavedGameSetsByPool(poolId: string | null) {
  return useQuery({
    queryKey: ['saved-game-sets-by-pool', poolId],
    queryFn: () => {
      if (!poolId) return Promise.resolve([])
      return SavedGameService.listSavedGameSetsByPool(poolId)
    },
    enabled: !!poolId,
    staleTime: 60 * 1000,
  })
}
