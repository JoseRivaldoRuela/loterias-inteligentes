import { ClosureVerifier } from '@/core/closures/ClosureVerifier'
import { Combinatorics } from '@/core/closures/Combinatorics'
import type {
  ClosureRequest,
  ClosureResult,
} from '@/core/closures/ClosureTypes'

const MAXIMUM_CANDIDATES = 10_000
const MAXIMUM_COVERAGE_RELATIONS = 2_000_000

type CandidateCoverage = {
  ticket: number[]
  scenarioIndexes: number[]
}

export class GreedyClosureStrategy {
  static generate(request: ClosureRequest): ClosureResult {
    this.validateRequest(request)

    const candidates = Combinatorics.generate(
      request.universe,
      request.ticketSize,
    )

    if (candidates.length > MAXIMUM_CANDIDATES) {
      throw new Error(
        `Este fechamento possui ${candidates.length.toLocaleString(
          'pt-BR',
        )} cartões candidatos. O limite seguro desta versão é ${MAXIMUM_CANDIDATES.toLocaleString(
          'pt-BR',
        )}. Será necessário usar o processador avançado para este tamanho.`,
      )
    }

    const scenarios = Combinatorics.generate(
      request.universe,
      request.conditionHitsInsideUniverse,
    )

    const scenariosPerCandidate = Combinatorics.count(
      request.ticketSize,
      request.conditionHitsInsideUniverse,
    )

    const estimatedCoverageRelations =
      candidates.length * scenariosPerCandidate

    if (
      estimatedCoverageRelations >
      MAXIMUM_COVERAGE_RELATIONS
    ) {
      throw new Error(
        'Este fechamento ultrapassa o limite seguro de processamento no navegador. ' +
          'Reduza temporariamente a quantidade de dezenas escolhidas.',
      )
    }

    const scenarioIndexByKey = new Map<string, number>()

    scenarios.forEach((scenario, index) => {
      scenarioIndexByKey.set(
        this.createCanonicalKey(scenario),
        index,
      )
    })

    const candidateCoverages = candidates.map(
      (candidate): CandidateCoverage => {
        const coveredScenarios = Combinatorics.generate(
          candidate,
          request.conditionHitsInsideUniverse,
        )

        const scenarioIndexes: number[] = []

        for (const scenario of coveredScenarios) {
          const scenarioIndex = scenarioIndexByKey.get(
            this.createCanonicalKey(scenario),
          )

          if (scenarioIndex !== undefined) {
            scenarioIndexes.push(scenarioIndex)
          }
        }

        return {
          ticket: candidate,
          scenarioIndexes,
        }
      },
    )

    const uncovered = new Uint8Array(scenarios.length)
    uncovered.fill(1)

    let uncoveredCount = scenarios.length

    const selectedTickets: number[][] = []
    const usedCandidates = new Uint8Array(
      candidateCoverages.length,
    )

    while (uncoveredCount > 0) {
      let bestCandidateIndex = -1
      let bestCoverageCount = 0

      for (
        let candidateIndex = 0;
        candidateIndex < candidateCoverages.length;
        candidateIndex += 1
      ) {
        if (usedCandidates[candidateIndex] === 1) {
          continue
        }

        const coverage =
          candidateCoverages[candidateIndex].scenarioIndexes

        let currentCoverageCount = 0

        for (const scenarioIndex of coverage) {
          if (uncovered[scenarioIndex] === 1) {
            currentCoverageCount += 1
          }
        }

        if (currentCoverageCount > bestCoverageCount) {
          bestCoverageCount = currentCoverageCount
          bestCandidateIndex = candidateIndex
        }
      }

      if (
        bestCandidateIndex < 0 ||
        bestCoverageCount === 0
      ) {
        break
      }

      usedCandidates[bestCandidateIndex] = 1

      const bestCandidate =
        candidateCoverages[bestCandidateIndex]

      selectedTickets.push(bestCandidate.ticket)

      for (const scenarioIndex of bestCandidate.scenarioIndexes) {
        if (uncovered[scenarioIndex] === 1) {
          uncovered[scenarioIndex] = 0
          uncoveredCount -= 1
        }
      }

      if (
        request.maximumTickets !== undefined &&
        selectedTickets.length >= request.maximumTickets
      ) {
        break
      }
    }

    const orderedTickets = selectedTickets.map((ticket) =>
      this.orderByUniverse(ticket, request.universe),
    )

    const verification = ClosureVerifier.verify(
      request,
      orderedTickets,
    )

    if (!verification.guaranteeConfirmed) {
      throw new Error(
        `A garantia de ${request.targetHits} acertos não foi confirmada. ` +
          `Cobertura obtida: ${verification.coveragePercentage.toFixed(
            2,
          )}%.`,
      )
    }

    return {
      tickets: orderedTickets,
      request,
      verification,
      generatedAt: new Date().toISOString(),
    }
  }

  private static validateRequest(
    request: ClosureRequest,
  ): void {
    if (request.method !== 'greedy') {
      throw new Error(
        'A estratégia otimizada exige o método "greedy".',
      )
    }

    if (request.universe.length === 0) {
      throw new Error(
        'Selecione as dezenas do fechamento.',
      )
    }

    if (
      new Set(request.universe).size !==
      request.universe.length
    ) {
      throw new Error(
        'As dezenas selecionadas não podem se repetir.',
      )
    }

    if (
      !Number.isInteger(request.ticketSize) ||
      request.ticketSize <= 0 ||
      request.ticketSize > request.universe.length
    ) {
      throw new Error(
        'A quantidade de dezenas por cartão é inválida.',
      )
    }

    if (
      !Number.isInteger(
        request.conditionHitsInsideUniverse,
      ) ||
      request.conditionHitsInsideUniverse <= 0 ||
      request.conditionHitsInsideUniverse >
        request.ticketSize
    ) {
      throw new Error(
        'A quantidade de acertos que deverá ser coberta é inválida.',
      )
    }

    if (
      request.targetHits !==
      request.conditionHitsInsideUniverse
    ) {
      throw new Error(
        'A garantia e a quantidade de dezenas cobertas devem ser iguais neste tipo de fechamento.',
      )
    }
  }

  private static createCanonicalKey(
    numbers: number[],
  ): string {
    return [...numbers]
      .sort((first, second) => first - second)
      .join('-')
  }

  private static orderByUniverse(
    ticket: number[],
    universe: number[],
  ): number[] {
    const positions = new Map(
      universe.map((number, index) => [number, index]),
    )

    return [...ticket].sort(
      (first, second) =>
        (positions.get(first) ?? 0) -
        (positions.get(second) ?? 0),
    )
  }
}