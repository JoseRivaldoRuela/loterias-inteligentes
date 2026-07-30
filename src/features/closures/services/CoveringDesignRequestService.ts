import {
  CoveringDesignRequestRepository,
  type CoveringDesignRequest,
} from '@/infrastructure/repositories/CoveringDesignRequestRepository'

export const CoveringDesignRequestService = {
  async request(
    lotteryId: string,
    universeSize: number,
    ticketSize: number,
    guaranteeSize: number,
  ): Promise<CoveringDesignRequest> {
    if (!lotteryId) {
      throw new Error('Selecione uma loteria.')
    }

    if (
      !Number.isInteger(universeSize) ||
      universeSize <= 0
    ) {
      throw new Error(
        'A quantidade de dezenas escolhidas é inválida.',
      )
    }

    if (
      !Number.isInteger(ticketSize) ||
      ticketSize <= 0 ||
      ticketSize > universeSize
    ) {
      throw new Error(
        'A quantidade de dezenas por cartão é inválida.',
      )
    }

    if (
      !Number.isInteger(guaranteeSize) ||
      guaranteeSize <= 0 ||
      guaranteeSize > ticketSize
    ) {
      throw new Error(
        'A garantia escolhida é inválida.',
      )
    }

    return CoveringDesignRequestRepository.createOrRefresh(
      lotteryId,
      universeSize,
      ticketSize,
      guaranteeSize,
    )
  },
}