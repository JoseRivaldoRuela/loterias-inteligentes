import { ClosureVerifier } from '@/core/closures/ClosureVerifier'
import { Combinatorics } from '@/core/closures/Combinatorics'
import type {
  ClosureRequest,
  ClosureResult,
} from '@/core/closures/ClosureTypes'

export class ExhaustiveClosureStrategy {
  static generate(request: ClosureRequest): ClosureResult {
    this.validateMethod(request)

    const tickets = Combinatorics.generate(
      request.universe,
      request.ticketSize,
    )

    if (
      request.maximumTickets &&
      tickets.length > request.maximumTickets
    ) {
      throw new Error(
        `O fechamento exaustivo exige ${tickets.length} cartões, acima do limite informado de ${request.maximumTickets}.`,
      )
    }

    const verification = ClosureVerifier.verify(
      request,
      tickets,
    )

    return {
      tickets,
      request,
      verification,
      generatedAt: new Date().toISOString(),
    }
  }

  private static validateMethod(
    request: ClosureRequest,
  ): void {
    if (request.method !== 'exhaustive') {
      throw new Error(
        'A estratégia exaustiva exige o método "exhaustive".',
      )
    }
  }
}