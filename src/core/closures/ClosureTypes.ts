export type ClosureMethod =
  | 'exhaustive'
  | 'greedy'
  | 'optimized'

export type ClosureRequest = {
  universe: number[]
  ticketSize: number
  drawSize: number
  targetHits: number
  conditionHitsInsideUniverse: number
  method: ClosureMethod
  maximumTickets?: number
}

export type ClosureVerification = {
  guaranteeConfirmed: boolean
  requestedGuarantee: number
  verifiedGuarantee: number
  totalScenarios: number
  coveredScenarios: number
  coveragePercentage: number
  uncoveredScenarios: number
  uncoveredScenariosSample: number[][]
  verificationTimeMs: number
}

export type ClosureResult = {
  tickets: number[][]
  request: ClosureRequest
  verification: ClosureVerification
  generatedAt: string
}