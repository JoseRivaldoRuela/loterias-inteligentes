import {
  CoveringDesignRepository,
  type CoveringDesign,
} from '@/infrastructure/repositories/CoveringDesignRepository'

export type AppliedCoveringDesign = {
  design: CoveringDesign
  tickets: number[][]
}

export const CoveringDesignService = {
  async findBestVerified(
    lotteryId: string,
    universeSize: number,
    ticketSize: number,
    guaranteeSize: number,
  ): Promise<CoveringDesign | null> {
    if (!lotteryId) {
      return null
    }

    if (
      !Number.isInteger(universeSize) ||
      !Number.isInteger(ticketSize) ||
      !Number.isInteger(guaranteeSize) ||
      universeSize <= 0 ||
      guaranteeSize <= 0 ||
      guaranteeSize > ticketSize ||
      ticketSize > universeSize
    ) {
      return null
    }

    return CoveringDesignRepository.findBestVerified(
      lotteryId,
      universeSize,
      ticketSize,
      guaranteeSize,
    )
  },

  applyToSelectedNumbers(
    design: CoveringDesign,
    selectedNumbers: number[],
  ): AppliedCoveringDesign {
    if (selectedNumbers.length !== design.universeSize) {
      throw new Error(
        `Este fechamento exige exatamente ${design.universeSize} dezenas selecionadas.`,
      )
    }

    if (
      new Set(selectedNumbers).size !==
      selectedNumbers.length
    ) {
      throw new Error(
        'As dezenas selecionadas não podem se repetir.',
      )
    }

    const tickets = design.blocks.map(
      (block, blockIndex) =>
        block.map((position) => {
          const selectedNumber =
            selectedNumbers[position - 1]

          if (selectedNumber === undefined) {
            throw new Error(
              `A posição ${position} do cartão ${
                blockIndex + 1
              } não existe no universo selecionado.`,
            )
          }

          return selectedNumber
        }),
    )

    return {
      design,
      tickets,
    }
  },

  getOptimalityLabel(
    status: CoveringDesign['optimalityStatus'],
  ): string {
    switch (status) {
      case 'proven_optimal':
        return 'Mínimo matemático comprovado'

      case 'best_known':
        return 'Melhor construção conhecida'

      case 'valid_construction':
        return 'Construção válida verificada'
    }
  },
}