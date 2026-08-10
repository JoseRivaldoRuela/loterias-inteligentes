import { supabase } from '@/infrastructure/supabase/client'

export type CoveringRequestStatus =
  | 'pending'
  | 'processing'
  | 'available'
  | 'rejected'

export type CoveringDesignRequest = {
  id: string
  userId: string
  lotteryId: string
  universeSize: number
  ticketSize: number
  guaranteeSize: number
  status: CoveringRequestStatus
  requestedAt: string
  updatedAt: string
}

type CoveringDesignRequestRow = {
  id: string
  user_id: string
  lottery_id: string
  universe_size: number
  ticket_size: number
  guarantee_size: number
  status: CoveringRequestStatus
  requested_at: string
  updated_at: string
}

function mapRequest(
  row: CoveringDesignRequestRow,
): CoveringDesignRequest {
  return {
    id: row.id,
    userId: row.user_id,
    lotteryId: row.lottery_id,
    universeSize: row.universe_size,
    ticketSize: row.ticket_size,
    guaranteeSize: row.guarantee_size,
    status: row.status,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
  }
}

export const CoveringDesignRequestRepository = {
  async createOrRefresh(
    lotteryId: string,
    universeSize: number,
    ticketSize: number,
    guaranteeSize: number,
  ): Promise<CoveringDesignRequest> {
    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw new Error(
        `Não foi possível identificar o usuário: ${userError.message}`,
      )
    }

    const user = userData.user

    if (!user) {
      throw new Error(
        'É necessário estar autenticado para solicitar um fechamento.',
      )
    }

    const { data, error } = await supabase
      .from('covering_design_requests')
      .upsert(
        {
          user_id: user.id,
          lottery_id: lotteryId,
          universe_size: universeSize,
          ticket_size: ticketSize,
          guarantee_size: guaranteeSize,
          status: 'pending',
          requested_at: new Date().toISOString(),
        },
        {
          onConflict:
            'user_id,lottery_id,universe_size,ticket_size,guarantee_size',
        },
      )
      .select(`
        id,
        user_id,
        lottery_id,
        universe_size,
        ticket_size,
        guarantee_size,
        status,
        requested_at,
        updated_at
      `)
      .single()

    if (error) {
      throw new Error(
        `Não foi possível registrar a solicitação: ${error.message}`,
      )
    }

    return mapRequest(
      data as CoveringDesignRequestRow,
    )
  },

  async listByUser(): Promise<CoveringDesignRequest[]> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado.')
    }

    const { data, error } = await supabase
      .from('covering_design_requests')
      .select(
        `id, user_id, lottery_id, universe_size, ticket_size, guarantee_size, status, requested_at, updated_at`,
      )
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao carregar solicitações: ${error.message}`)
    }

    return (data as CoveringDesignRequestRow[]).map(mapRequest)
  },
}