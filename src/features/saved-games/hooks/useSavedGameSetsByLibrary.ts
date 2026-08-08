import { useQuery } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useSavedGameSetsByLibrary(libraryId: string | null) {
  return useQuery({
    queryKey: ['saved-game-sets-by-library', libraryId],
    queryFn: () => {
      if (!libraryId) return Promise.resolve([])
      return SavedGameService.listSavedGameSetsByLibrary(libraryId)
    },
    enabled: !!libraryId,
    staleTime: 60 * 1000,
  })
}
