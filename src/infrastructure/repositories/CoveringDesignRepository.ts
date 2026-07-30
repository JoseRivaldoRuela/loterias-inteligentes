import { supabase } from '@/infrastructure/supabase/client'

export type CoveringOptimalityStatus =
  | 'proven_optimal'
  | 'best_known'
  | 'valid_construction'

export type CoveringSourceType =
  | 'literature'
  | 'repository'
  | 'exact_solver'
  | 'imported'
  | 'internal'

export type CoveringDesign = {
  id: string
  lotteryId: string
  universeSize: number
  ticketSize: number
  guaranteeSize: number
  ticketCount: number
  lowerBound: number | null
  upperBound: number | null
  optimalityStatus: CoveringOptimalityStatus
  sourceType: CoveringSourceType
  sourceName: string | null
  sourceReference: string | null
  sourceUrl: string | null
  blocks: number[][]
  coverageVerified: boolean
  totalRequiredSubsets: number | null
  coveredRequiredSubsets: number | null
  verificationAlgorithm: string | null
  verificationVersion: string | null
  verifiedAt: string | null
  verificationTimeMs: number | null
  matrixHash: string | null
  notes: string | null
}

type CoveringDesignRow = {
  id: string
  lottery_id: string
  universe_size: number
  ticket_size: number
  guarantee_size: number
  ticket_count: number
  lower_bound: number | null
  upper_bound: number | null
  optimality_status: CoveringOptimalityStatus
  source_type: CoveringSourceType
  source_name: string | null
  source_reference: string | null
  source_url: string | null
  blocks: unknown
  coverage_verified: boolean
  total_required_subsets: number | string | null
  covered_required_subsets: number | string | null
  verification_algorithm: string | null
  verification_version: string | null
  verified_at: string | null
  verification_time_ms: number | string | null
  matrix_hash: string | null
  notes: string | null
}

function parseBlocks(
  value: unknown,
  universeSize: number,
  ticketSize: number,
): number[][] {
  if (!Array.isArray(value)) {
    throw new Error('A matriz do fechamento possui formato inválido.')
  }

  const blocks = value.map((block, blockIndex) => {
    if (!Array.isArray(block)) {
      throw new Error(
        `O cartão ${blockIndex + 1} da matriz possui formato inválido.`,
      )
    }

    const numbers = block.map((item) => Number(item))

    if (
      numbers.length !== ticketSize ||
      numbers.some(
        (number) =>
          !Number.isInteger(number) ||
          number < 1 ||
          number > universeSize,
      )
    ) {
      throw new Error(
        `O cartão ${blockIndex + 1} da matriz possui posições inválidas.`,
      )
    }

    if (new Set(numbers).size !== numbers.length) {
      throw new Error(
        `O cartão ${blockIndex + 1} da matriz possui posições repetidas.`,
      )
    }

    return numbers
  })

  return blocks
}

function mapCoveringDesign(
  row: CoveringDesignRow,
): CoveringDesign {
  return {
    id: row.id,
    lotteryId: row.lottery_id,
    universeSize: row.universe_size,
    ticketSize: row.ticket_size,
    guaranteeSize: row.guarantee_size,
    ticketCount: row.ticket_count,
    lowerBound: row.lower_bound,
    upperBound: row.upper_bound,
    optimalityStatus: row.optimality_status,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceReference: row.source_reference,
    sourceUrl: row.source_url,
    blocks: parseBlocks(
      row.blocks,
      row.universe_size,
      row.ticket_size,
    ),
    coverageVerified: row.coverage_verified,
    totalRequiredSubsets:
      row.total_required_subsets === null
        ? null
        : Number(row.total_required_subsets),
    coveredRequiredSubsets:
      row.covered_required_subsets === null
        ? null
        : Number(row.covered_required_subsets),
    verificationAlgorithm: row.verification_algorithm,
    verificationVersion: row.verification_version,
    verifiedAt: row.verified_at,
    verificationTimeMs:
      row.verification_time_ms === null
        ? null
        : Number(row.verification_time_ms),
    matrixHash: row.matrix_hash,
    notes: row.notes,
  }
}

export const CoveringDesignRepository = {
  async findBestVerified(
    lotteryId: string,
    universeSize: number,
    ticketSize: number,
    guaranteeSize: number,
  ): Promise<CoveringDesign | null> {
    const { data, error } = await supabase
      .from('covering_designs')
      .select(`
        id,
        lottery_id,
        universe_size,
        ticket_size,
        guarantee_size,
        ticket_count,
        lower_bound,
        upper_bound,
        optimality_status,
        source_type,
        source_name,
        source_reference,
        source_url,
        blocks,
        coverage_verified,
        total_required_subsets,
        covered_required_subsets,
        verification_algorithm,
        verification_version,
        verified_at,
        verification_time_ms,
        matrix_hash,
        notes
      `)
      .eq('lottery_id', lotteryId)
      .eq('universe_size', universeSize)
      .eq('ticket_size', ticketSize)
      .eq('guarantee_size', guaranteeSize)
      .eq('coverage_verified', true)
      .eq('active', true)
      .order('ticket_count', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(
        `Erro ao consultar o fechamento: ${error.message}`,
      )
    }

    return data
      ? mapCoveringDesign(data as CoveringDesignRow)
      : null
  },
}