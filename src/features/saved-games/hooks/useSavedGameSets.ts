import { useQuery } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export const savedGameQueryKeys = {
  all: ['saved-game-sets'] as const,
}

export function useSavedGameSets() {
  return useQuery({
    queryKey: savedGameQueryKeys.all,
    queryFn: () => SavedGameService.listSavedGameSets(),
    staleTime: 60 * 1000,
  })
}
