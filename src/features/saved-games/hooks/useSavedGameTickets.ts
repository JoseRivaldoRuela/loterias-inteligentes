import { useQuery } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useSavedGameTickets(gameSetId: string) {
  return useQuery({
    queryKey: ['saved-game-tickets', gameSetId],
    queryFn: () => SavedGameService.getSavedGameTickets(gameSetId),
    enabled: Boolean(gameSetId),
    staleTime: 60 * 1000,
  })
}
