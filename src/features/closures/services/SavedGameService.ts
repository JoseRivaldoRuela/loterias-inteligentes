import { SavedGameRepository } from '@/infrastructure/repositories/SavedGameRepository'

export const SavedGameService = {
  async saveClosure(
    lotteryId: string,
    name: string,
    description: string | null,
    selectedNumbers: number[],
    ticketSize: number,
    guaranteeSize: number,
    generatedTickets: number[][],
    libraryId: string | null,
    contestFrom: string | null,
    contestTo: string | null,
  ) {
    const gameSet = await SavedGameRepository.createSavedGameSet(
      lotteryId,
      name,
      description,
      selectedNumbers,
      ticketSize,
      guaranteeSize,
      libraryId,
      null,
      'closure',
      {
        savedFrom: 'closures',
        contestFrom,
        contestTo,
      },
      generatedTickets.length,
    )

    await SavedGameRepository.createSavedGameTickets(
      gameSet.id,
      generatedTickets,
    )

    return gameSet
  },

  async saveGeneratedGame(
    lotteryId: string,
    name: string,
    description: string | null,
    selectedNumbers: number[],
    ticketSize: number,
    tickets: number[][],
    libraryId: string | null,
    contestFrom: string | null,
    contestTo: string | null,
  ) {
    const ticketSizes = [...new Set(tickets.map((ticket) => ticket.length))].sort((a, b) => a - b)
    const gameSet = await SavedGameRepository.createSavedGameSet(
      lotteryId,
      name,
      description,
      selectedNumbers,
      Math.min(...ticketSizes, ticketSize),
      null,
      libraryId,
      null,
      'generated',
      {
        savedFrom: 'generator',
        contestFrom,
        contestTo,
        ticketSizes,
        mixedTicketSizes: ticketSizes.length > 1,
      },
      tickets.length,
    )

    await SavedGameRepository.createSavedGameTickets(
      gameSet.id,
      tickets,
    )

    return gameSet
  },

  async saveImportedGames(
    lotteryId: string,
    name: string,
    tickets: number[][],
    libraryId: string | null,
    playedContests: number[],
    fileName: string,
  ) {
    const selectedNumbers = [...new Set(tickets.flat())].sort((a, b) => a - b)
    const ticketSizes = [...new Set(tickets.map((ticket) => ticket.length))].sort((a, b) => a - b)
    const gameSet = await SavedGameRepository.createSavedGameSet(
      lotteryId, name, `Importado de ${fileName}`, selectedNumbers,
      Math.min(...ticketSizes), null, libraryId, null, 'imported',
      { savedFrom: 'import', fileName, playedContests, ticketSizes, mixedTicketSizes: ticketSizes.length > 1 }, tickets.length,
    )
    await SavedGameRepository.createSavedGameTickets(gameSet.id, tickets)
    return gameSet
  },

  async listSavedGameSets() {
    return SavedGameRepository.listSavedGameSets()
  },

  async listSavedGameSetsByPool(poolId: string) {
    return SavedGameRepository.listSavedGameSetsByPool(poolId)
  },

  async listSavedGameSetsByLibrary(libraryId: string) {
    return SavedGameRepository.listSavedGameSetsByLibrary(libraryId)
  },

  async getSavedGameTickets(gameSetId: string) {
    return SavedGameRepository.getSavedGameTickets(gameSetId)
  },

  async updatePlayedContests(gameSetId: string, playedContests: number[]) {
    return SavedGameRepository.updatePlayedContests(gameSetId, playedContests)
  },

  async moveSavedGameSetToLibrary(
    gameSetId: string,
    libraryId: string | null,
  ) {
    return SavedGameRepository.updateSavedGameSetLibrary(
      gameSetId,
      libraryId,
    )
  },
}
