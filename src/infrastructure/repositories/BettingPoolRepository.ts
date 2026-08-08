import { supabase } from '@/infrastructure/supabase/client'

export type BettingPool = {
  id: string
  ownerId: string
  lotteryId: string
  name: string
  description: string | null
  status: string
  totalShares: number
  sharePrice: number | null
  totalAmount: number | null
  firstContestNumber: number | null
  lastContestNumber: number | null
  rules: Record<string, unknown>
  createdAt: string
}

export type PoolInvitation = { id: string; bettingPoolId: string; invitedEmail: string; role: 'manager' | 'member'; status: string; createdAt: string }
export type PoolParticipant = { id: string; name: string; email: string | null; phone: string | null; shareCount: number; active: boolean }
export type PoolParticipantInput = { name: string; email: string; phone: string; shareCount: number }
export type PoolParticipantSummary = { bettingPoolId: string; names: string[]; count: number }
export type CreateBettingPoolInput = { lotteryId: string; name: string; description?: string; status: 'draft' | 'active'; firstContestNumber: number | null; lastContestNumber: number | null; totalShares: number; totalAmount: number; gameSetId: string; participants: PoolParticipantInput[]; creatorParticipates: boolean }

async function sendInvitation(poolId: string, email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-pool-invitation', {
    body: { poolId, email: email.trim().toLowerCase() },
  })
  if (error) throw new Error(`Erro ao enviar convite: ${error.message}`)
  if (data?.error) throw new Error(data.error)
}

type BettingPoolRow = {
  id: string
  owner_id: string
  lottery_id: string
  name: string
  description: string | null
  status: string
  total_shares: number
  share_price: number | null
  total_amount: number | null
  first_contest_number: number | null
  last_contest_number: number | null
  rules: Record<string, unknown>
  created_at: string
}

function mapPool(row: BettingPoolRow): BettingPool {
  return {
    id: row.id,
    ownerId: row.owner_id,
    lotteryId: row.lottery_id,
    name: row.name,
    description: row.description,
    status: row.status,
    totalShares: row.total_shares,
    sharePrice: row.share_price as number | null,
    totalAmount: row.total_amount as number | null,
    firstContestNumber: row.first_contest_number,
    lastContestNumber: row.last_contest_number,
    rules: row.rules,
    createdAt: row.created_at,
  }
}

export const BettingPoolRepository = {
  async createWithGame(input: CreateBettingPoolInput): Promise<BettingPool> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Usuário não autenticado.')
    const { data, error } = await supabase.rpc('create_betting_pool_with_participants', {
      requested_lottery_id: input.lotteryId, requested_game_set_id: input.gameSetId,
      requested_name: input.name.trim(), requested_description: input.description?.trim() || '',
      requested_status: input.status, requested_first_contest: input.firstContestNumber,
      requested_last_contest: input.lastContestNumber, requested_total_shares: input.totalShares,
      creator_participates: input.creatorParticipates, requested_participants: input.participants,
    })
    if (error || !data) {
      throw new Error(`Erro ao criar bolão: ${error?.message}`)
    }
    let pool = mapPool(data as BettingPoolRow)
    const sharePrice = input.totalAmount / input.totalShares
    const { data: pricedPool, error: priceError } = await supabase
      .from('betting_pools')
      .update({ total_amount: input.totalAmount, share_price: sharePrice })
      .eq('id', pool.id)
      .select('id, owner_id, lottery_id, name, description, status, total_shares, share_price, total_amount, first_contest_number, last_contest_number, rules, created_at')
      .single()
    if (priceError || !pricedPool) throw new Error(`Bolão criado, mas não foi possível gravar os valores: ${priceError?.message}`)
    pool = mapPool(pricedPool as BettingPoolRow)
    const emails = [...new Set(input.participants.map((item) => item.email.trim().toLowerCase()).filter(Boolean))]
    const deliveries = await Promise.allSettled(emails.map((email) => sendInvitation(pool.id, email)))
    const failedDeliveries = deliveries.filter((delivery) => delivery.status === 'rejected')
    if (failedDeliveries.length > 0) {
      console.error(`${failedDeliveries.length} convite(s) do bolão não foram enviados.`, failedDeliveries)
    }
    return pool
  },
  async updateStatus(poolId: string, status: string): Promise<void> {
    const { error } = await supabase.from('betting_pools').update({ status }).eq('id', poolId)
    if (error) throw new Error(`Erro ao atualizar situação: ${error.message}`)
  },
  async listInvitations(poolId: string): Promise<PoolInvitation[]> {
    const { data, error } = await supabase.from('betting_pool_invitations').select('id, betting_pool_id, invited_email, role, status, created_at').eq('betting_pool_id', poolId).order('created_at')
    if (error) throw new Error(`Erro ao carregar participantes: ${error.message}`)
    return (data ?? []).map((row) => ({ id: row.id, bettingPoolId: row.betting_pool_id, invitedEmail: row.invited_email, role: row.role, status: row.status, createdAt: row.created_at }))
  },
  async listParticipants(poolId: string): Promise<PoolParticipant[]> {
    const { data, error } = await supabase
      .from('betting_pool_participants')
      .select('id, name, email, phone, share_count, active')
      .eq('betting_pool_id', poolId)
      .eq('active', true)
      .order('name')
    if (error) throw new Error(`Erro ao carregar participantes: ${error.message}`)
    const participants = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      shareCount: row.share_count,
      active: row.active,
    }))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: membership } = await supabase
        .from('betting_pool_members')
        .select('id, share_count')
        .eq('betting_pool_id', poolId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .gt('share_count', 0)
        .maybeSingle()
      if (membership) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
        const ownerName = profile?.name?.trim() || user.user_metadata?.full_name || user.email || 'Organizador'
        const alreadyListed = participants.some((participant) => participant.email && participant.email.toLowerCase() === user.email?.toLowerCase())
        if (!alreadyListed) participants.unshift({ id: membership.id, name: ownerName, email: user.email ?? null, phone: null, shareCount: membership.share_count, active: true })
      }
    }
    return participants
  },
  async listParticipantSummaries(poolIds: string[]): Promise<PoolParticipantSummary[]> {
    if (poolIds.length === 0) return []
    const { data, error } = await supabase
      .from('betting_pool_participants')
      .select('betting_pool_id, name')
      .in('betting_pool_id', poolIds)
      .eq('active', true)
      .order('name')
    if (error) throw new Error(`Erro ao carregar participantes dos bolões: ${error.message}`)
    const grouped = new Map<string, string[]>()
    for (const row of data ?? []) {
      const names = grouped.get(row.betting_pool_id) ?? []
      names.push(row.name)
      grouped.set(row.betting_pool_id, names)
    }
    return poolIds.map((bettingPoolId) => ({ bettingPoolId, names: grouped.get(bettingPoolId) ?? [], count: grouped.get(bettingPoolId)?.length ?? 0 }))
  },
  async invite(poolId: string, email: string): Promise<void> {
    await sendInvitation(poolId, email)
  },
  async listForUser(): Promise<BettingPool[]> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado.')
    }

    // pools owned by user
    const { data: owned, error: ownedError } = await supabase
      .from('betting_pools')
      .select(
        `id, owner_id, lottery_id, name, description, status, total_shares, share_price, total_amount, first_contest_number, last_contest_number, rules, created_at`,
      )
      .eq('owner_id', user.id)

    if (ownedError) {
      throw new Error(`Erro ao carregar bolões: ${ownedError.message}`)
    }

    // pools where user is member
    const { data: memberships, error: memError } = await supabase
      .from('betting_pool_members')
      .select('betting_pool_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')

    if (memError) {
      throw new Error(`Erro ao carregar bolões: ${memError.message}`)
    }

    const poolIds = (memberships ?? []).map((m: any) => m.betting_pool_id)

    let memberPools: BettingPoolRow[] = []

    if (poolIds.length > 0) {
      const { data: memberData, error: memberDataError } = await supabase
        .from('betting_pools')
        .select(
          `id, owner_id, lottery_id, name, description, status, total_shares, share_price, total_amount, first_contest_number, last_contest_number, rules, created_at`,
        )
        .in('id', poolIds)

      if (memberDataError) {
        throw new Error(`Erro ao carregar bolões: ${memberDataError.message}`)
      }

      memberPools = memberData as BettingPoolRow[]
    }

    const rows = [...(owned ?? []), ...memberPools]

    // deduplicate by id
    const unique = Array.from(new Map(rows.map((r: BettingPoolRow) => [r.id, r])).values())

    return unique.map(mapPool)
  },
  async updateContestRange(
    poolId: string,
    firstContestNumber: number | null,
    lastContestNumber: number | null,
  ): Promise<BettingPool> {
    const { data, error } = await supabase
      .from('betting_pools')
      .update({ first_contest_number: firstContestNumber, last_contest_number: lastContestNumber })
      .eq('id', poolId)
      .select(
        `id, owner_id, lottery_id, name, description, status, total_shares, share_price, total_amount, first_contest_number, last_contest_number, rules, created_at`,
      )
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar intervalo de concursos: ${error?.message}`)
    }

    return mapPool(data as BettingPoolRow)
  },
}
