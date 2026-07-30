import { Combinatorics } from '@/core/closures/Combinatorics'
import type {
  ClosureRequest,
  ClosureVerification,
} from '@/core/closures/ClosureTypes'

const MAX_STORED_UNCOVERED_SCENARIOS = 100

export class ClosureVerifier {
  static verify(
    request: ClosureRequest,
    tickets: number[][],
  ): ClosureVerification {
    const startedAt = performance.now()

    this.validateRequest(request)
    this.validateTickets(request, tickets)

    const scenarios = Combinatorics.generate(
      request.universe,
      request.conditionHitsInsideUniverse,
    )

    let coveredScenarios = 0
    let verifiedGuarantee =
      request.conditionHitsInsideUniverse

    const uncoveredScenariosSample: number[][] = []

    for (const scenario of scenarios) {
      let bestHits = 0

      for (const ticket of tickets) {
        const hits = Combinatorics.countIntersection(
          scenario,
          ticket,
        )

        if (hits > bestHits) {
          bestHits = hits
        }

        if (bestHits >= request.targetHits) {
          break
        }
      }

      verifiedGuarantee = Math.min(
        verifiedGuarantee,
        bestHits,
      )

      if (bestHits >= request.targetHits) {
        coveredScenarios += 1
      } else if (
        uncoveredScenariosSample.length <
        MAX_STORED_UNCOVERED_SCENARIOS
      ) {
        uncoveredScenariosSample.push([...scenario])
      }
    }

    const totalScenarios = scenarios.length

    const coveragePercentage =
      totalScenarios === 0
        ? 0
        : (coveredScenarios / totalScenarios) * 100

    return {
      guaranteeConfirmed:
        totalScenarios > 0 &&
        coveredScenarios === totalScenarios,
      requestedGuarantee: request.targetHits,
      verifiedGuarantee,
      totalScenarios,
      coveredScenarios,
      coveragePercentage,
      uncoveredScenarios:
        totalScenarios - coveredScenarios,
      uncoveredScenariosSample,
      verificationTimeMs:
        performance.now() - startedAt,
    }
  }

  private static validateRequest(
    request: ClosureRequest,
  ): void {
    const uniqueUniverse = new Set(request.universe)

    if (request.universe.length === 0) {
      throw new Error(
        'O universo do fechamento não pode estar vazio.',
      )
    }

    if (uniqueUniverse.size !== request.universe.length) {
      throw new Error(
        'O universo do fechamento contém dezenas repetidas.',
      )
    }

    if (
      request.ticketSize <= 0 ||
      request.ticketSize > request.universe.length
    ) {
      throw new Error(
        'O tamanho do cartão é incompatível com o universo.',
      )
    }

    if (
      request.conditionHitsInsideUniverse <= 0 ||
      request.conditionHitsInsideUniverse >
        request.universe.length
    ) {
      throw new Error(
        'A condição de acertos dentro do universo é inválida.',
      )
    }

    if (
      request.targetHits <= 0 ||
      request.targetHits > request.ticketSize ||
      request.targetHits >
        request.conditionHitsInsideUniverse
    ) {
      throw new Error(
        'A garantia solicitada é incompatível com o fechamento.',
      )
    }
  }

  private static validateTickets(
    request: ClosureRequest,
    tickets: number[][],
  ): void {
    const universeSet = new Set(request.universe)
    const ticketKeys = new Set<string>()

    for (const ticket of tickets) {
      if (ticket.length !== request.ticketSize) {
        throw new Error(
          `Todos os cartões devem possuir ${request.ticketSize} dezenas.`,
        )
      }

      const uniqueTicket = new Set(ticket)

      if (uniqueTicket.size !== ticket.length) {
        throw new Error(
          'Um cartão do fechamento contém dezenas repetidas.',
        )
      }

      const invalidNumbers = ticket.filter(
        (number) => !universeSet.has(number),
      )

      if (invalidNumbers.length > 0) {
        throw new Error(
          `O cartão contém dezenas fora do universo: ${invalidNumbers.join(', ')}.`,
        )
      }

      const canonicalKey = [...ticket]
        .sort((first, second) => first - second)
        .join('-')

      if (ticketKeys.has(canonicalKey)) {
        throw new Error(
          'O fechamento contém cartões duplicados.',
        )
      }

      ticketKeys.add(canonicalKey)
    }
  }
}