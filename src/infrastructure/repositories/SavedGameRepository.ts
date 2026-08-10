import { supabase } from '@/infrastructure/supabase/client'

export type SavedGameSet = {
  id: string
  name: string
  description: string | null
  lotteryId: string
  libraryId: string | null
  bettingPoolId: string | null
  sourceType: 'closure' | string
  universeSize: number | null
  ticketSize: number
  guaranteeSize: number | null
  selectedNumbers: number[] | null
  generationParameters: Record<string, unknown>
  ticketCount: number
  active: boolean
  createdAt: string
}

type SavedGameSetRow = {
  id: string
  name: string
  description: string | null
  lottery_id: string
  library_id: string | null
  betting_pool_id: string | null
  source_type: 'closure' | string
  universe_size: number | null
  ticket_size: number
  guarantee_size: number | null
  selected_numbers: number[] | null
  generation_parameters: Record<string, unknown>
  ticket_count: number
  active: boolean
  created_at: string
}

export type SavedGameTicket = {
  id: string
  gameSetId: string
  ticketOrder: number
  numbers: number[]
  createdAt: string
}

type SavedGameTicketRow = {
  id: string
  game_set_id: string
  ticket_order: number
  numbers: number[]
  created_at: string
}

function mapSavedGameSet(row: SavedGameSetRow): SavedGameSet {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lotteryId: row.lottery_id,
    libraryId: row.library_id,
    bettingPoolId: row.betting_pool_id,
    sourceType: row.source_type,
    universeSize: row.universe_size,
    ticketSize: row.ticket_size,
    guaranteeSize: row.guarantee_size,
    selectedNumbers: row.selected_numbers,
    generationParameters: row.generation_parameters,
    ticketCount: row.ticket_count,
    active: row.active,
    createdAt: row.created_at,
  }
}

const savedGameSetFields = `
  id,
  name,
  description,
  lottery_id,
  library_id,
  betting_pool_id,
  source_type,
  universe_size,
  ticket_size,
  guarantee_size,
  selected_numbers,
  generation_parameters,
  ticket_count,
  active,
  created_at
`

export const SavedGameRepository = {
  async createSavedGameSet(
    lotteryId: string,
    name: string,
    description: string | null,
    selectedNumbers: number[] | null,
    ticketSize: number,
    guaranteeSize: number | null,
    libraryId: string | null,
    bettingPoolId: string | null,
    sourceType: 'closure' | string,
    generationParameters: Record<string, unknown>,
    ticketCount: number,
  ): Promise<SavedGameSet> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado.')
    }

    const { data, error } = await supabase
      .from('saved_game_sets')
      .insert({
        owner_id: user.id,
        lottery_id: lotteryId,
        library_id: libraryId,
        betting_pool_id: bettingPoolId,
        name,
        description,
        source_type: sourceType,
        universe_size: selectedNumbers
          ? selectedNumbers.length
          : null,
        ticket_size: ticketSize,
        guarantee_size: guaranteeSize,
        selected_numbers: selectedNumbers,
        generation_parameters: generationParameters,
        ticket_count: ticketCount,
      })
      .select(savedGameSetFields)
      .single()

    if (error || !data) {
      throw new Error(`Erro ao salvar conjunto de jogos: ${error?.message}`)
    }

    return mapSavedGameSet(data as SavedGameSetRow)
  },

  async updateSavedGameSetBettingPool(
    gameSetId: string,
    bettingPoolId: string | null,
  ): Promise<SavedGameSet> {
    const { data, error } = await supabase
      .from('saved_game_sets')
      .update({ betting_pool_id: bettingPoolId })
      .eq('id', gameSetId)
      .select(savedGameSetFields)
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar bolão do jogo salvo: ${error?.message}`)
    }

    return mapSavedGameSet(data as SavedGameSetRow)
  },

  async createSavedGameTickets(
    gameSetId: string,
    tickets: number[][],
  ): Promise<void> {
    const payload = tickets.map((numbers, index) => ({
      game_set_id: gameSetId,
      ticket_order: index + 1,
      numbers,
    }))

    const { error } = await supabase
      .from('saved_game_tickets')
      .insert(payload)

    if (error) {
      throw new Error(`Erro ao salvar cartões: ${error.message}`)
    }
  },

  async updateSavedGameSetLibrary(
    gameSetId: string,
    libraryId: string | null,
  ): Promise<SavedGameSet> {
    const { data, error } = await supabase
      .from('saved_game_sets')
      .update({ library_id: libraryId })
      .eq('id', gameSetId)
      .select(savedGameSetFields)
      .single()

    if (error || !data) {
      throw new Error(
        `Erro ao mover jogo salvo para biblioteca: ${error?.message}`,
      )
    }

    return mapSavedGameSet(data as SavedGameSetRow)
  },

  async listSavedGameSets(): Promise<SavedGameSet[]> {
    const { data, error } = await supabase
      .from('saved_game_sets')
      .select(savedGameSetFields)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao carregar jogos salvos: ${error.message}`)
    }

    return (data as SavedGameSetRow[]).map(mapSavedGameSet)
  },

  async listSavedGameSetsByLibrary(libraryId: string): Promise<SavedGameSet[]> {
    const { data, error } = await supabase
      .from('saved_game_sets')
      .select(savedGameSetFields)
      .eq('active', true)
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao carregar jogos salvos: ${error.message}`)
    }

    return (data as SavedGameSetRow[]).map(mapSavedGameSet)
  },

  async listSavedGameSetsByPool(bettingPoolId: string): Promise<SavedGameSet[]> {
    const { data, error } = await supabase
      .from('saved_game_sets')
      .select(savedGameSetFields)
      .eq('active', true)
      .eq('betting_pool_id', bettingPoolId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao carregar jogos salvos: ${error.message}`)
    }

    return (data as SavedGameSetRow[]).map(mapSavedGameSet)
  },

  async getSavedGameTickets(
    gameSetId: string,
  ): Promise<SavedGameTicket[]> {
    const { data, error } = await supabase
      .from('saved_game_tickets')
      .select('id, game_set_id, ticket_order, numbers, created_at')
      .eq('game_set_id', gameSetId)
      .order('ticket_order')

    if (error) {
      throw new Error(`Erro ao carregar cartões salvos: ${error.message}`)
    }

    return (data as SavedGameTicketRow[]).map((row) => ({
      id: row.id,
      gameSetId: row.game_set_id,
      ticketOrder: row.ticket_order,
      numbers: row.numbers,
      createdAt: row.created_at,
    }))
  },

  async updateContestRange(
    gameSetId: string,
    contestFrom: number | null,
    contestTo: number | null,
  ): Promise<SavedGameSet> {
    // fetch existing generation_parameters to merge
    const { data: existing, error: fetchError } = await supabase
      .from('saved_game_sets')
      .select('generation_parameters')
      .eq('id', gameSetId)
      .single()

    if (fetchError || !existing) {
      throw new Error(`Erro ao buscar jogo salvo: ${fetchError?.message}`)
    }

    const genParams = existing.generation_parameters || {}
    const updatedParams = { ...genParams, contestFrom, contestTo }

    const { data, error } = await supabase
      .from('saved_game_sets')
      .update({ generation_parameters: updatedParams })
      .eq('id', gameSetId)
      .select(savedGameSetFields)
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar intervalo de concursos do jogo salvo: ${error?.message}`)
    }

    return mapSavedGameSet(data as SavedGameSetRow)
  },

  async updatePlayedContests(
    gameSetId: string,
    playedContests: number[],
  ): Promise<SavedGameSet> {
    const { data: existing, error: fetchError } = await supabase
      .from('saved_game_sets')
      .select('generation_parameters')
      .eq('id', gameSetId)
      .single()

    if (fetchError || !existing) {
      throw new Error(`Erro ao buscar jogo salvo: ${fetchError?.message}`)
    }

    const generationParameters = {
      ...(existing.generation_parameters || {}),
      playedContests: [...new Set(playedContests)].sort((a, b) => a - b),
    }
    delete generationParameters.contestFrom
    delete generationParameters.contestTo

    const { data, error } = await supabase
      .from('saved_game_sets')
      .update({ generation_parameters: generationParameters })
      .eq('id', gameSetId)
      .select(savedGameSetFields)
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar concursos jogados: ${error?.message}`)
    }

    return mapSavedGameSet(data as SavedGameSetRow)
  },
}
