import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SavedGameService } from '@/features/closures/services/SavedGameService'

export function useSaveClosure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      lotteryId,
      name,
      description,
      selectedNumbers,
      ticketSize,
      guaranteeSize,
      generatedTickets,
      libraryId,
      contestFrom,
      contestTo,
    }: {
      lotteryId: string
      name: string
      description: string | null
      selectedNumbers: number[]
      ticketSize: number
      guaranteeSize: number
      generatedTickets: number[][]
      libraryId: string | null
      contestFrom: string | null
      contestTo: string | null
    }) =>
      SavedGameService.saveClosure(
        lotteryId,
        name,
        description,
        selectedNumbers,
        ticketSize,
        guaranteeSize,
        generatedTickets,
        libraryId,
        contestFrom,
        contestTo,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-game-sets'] })
    },
  })
}
