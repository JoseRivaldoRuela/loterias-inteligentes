import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useSaveGeneratedGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      lotteryId,
      name,
      description,
      selectedNumbers,
      ticketSize,
      tickets,
      libraryId,
      contestFrom,
      contestTo,
    }: {
      lotteryId: string
      name: string
      description: string | null
      selectedNumbers: number[]
      ticketSize: number
      tickets: number[][]
      libraryId: string | null
      contestFrom: string | null
      contestTo: string | null
    }) =>
      SavedGameService.saveGeneratedGame(
        lotteryId,
        name,
        description,
        selectedNumbers,
        ticketSize,
        tickets,
        libraryId,
        contestFrom,
        contestTo,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-game-sets'] })
    },
  })
}
