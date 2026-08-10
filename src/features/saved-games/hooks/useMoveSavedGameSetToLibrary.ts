import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useMoveSavedGameSetToLibrary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      gameSetId,
      libraryId,
    }: {
      gameSetId: string
      libraryId: string | null
    }) => SavedGameService.moveSavedGameSetToLibrary(gameSetId, libraryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-game-sets'] })
    },
  })
}
