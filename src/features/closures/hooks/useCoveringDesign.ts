import { useQuery } from '@tanstack/react-query'

import { CoveringDesignService } from '@/features/closures/services/CoveringDesignService'

export const coveringDesignQueryKeys = {
  all: ['covering-designs'] as const,

  bestVerified: (
    lotteryId: string,
    universeSize: number,
    ticketSize: number,
    guaranteeSize: number,
  ) =>
    [
      ...coveringDesignQueryKeys.all,
      'best-verified',
      lotteryId,
      universeSize,
      ticketSize,
      guaranteeSize,
    ] as const,
}

export function useCoveringDesign(
  lotteryId: string,
  universeSize: number,
  ticketSize: number,
  guaranteeSize: number,
) {
  const validParameters =
    Boolean(lotteryId) &&
    Number.isInteger(universeSize) &&
    Number.isInteger(ticketSize) &&
    Number.isInteger(guaranteeSize) &&
    universeSize > 0 &&
    guaranteeSize > 0 &&
    guaranteeSize <= ticketSize &&
    ticketSize <= universeSize

  return useQuery({
    queryKey: coveringDesignQueryKeys.bestVerified(
      lotteryId,
      universeSize,
      ticketSize,
      guaranteeSize,
    ),

    queryFn: () =>
      CoveringDesignService.findBestVerified(
        lotteryId,
        universeSize,
        ticketSize,
        guaranteeSize,
      ),

    enabled: validParameters,
    staleTime: 60 * 60 * 1000,
  })
}