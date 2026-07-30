import {
  AlertCircle,
  Banknote,
  CalendarClock,
  RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PricingService } from '@/features/pricing/services/PricingService'
import { useBetPrice } from '@/features/pricing/hooks/useBetPrice'

type CostSummaryProps = {
  lotteryId: string
  numbersPerBet: number
  ticketCount: number
}

export function CostSummary({
  lotteryId,
  numbersPerBet,
  ticketCount,
}: CostSummaryProps) {
  const {
    data: betPrice,
    isLoading,
    isError,
    error,
  } = useBetPrice(lotteryId, numbersPerBet)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <RefreshCw className="size-4 animate-spin" />

          <p className="text-sm text-muted-foreground">
            Consultando preço vigente...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 size-5 text-destructive" />

          <div>
            <p className="text-sm font-medium text-destructive">
              Não foi possível consultar o preço.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'Ocorreu um erro inesperado.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!betPrice) {
    return (
      <Card className="border-amber-500/40">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 size-5 text-amber-600" />

          <div>
            <p className="text-sm font-medium">
              Preço não cadastrado
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Não existe preço vigente para uma aposta de{' '}
              {numbersPerBet} dezenas.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const calculation = PricingService.calculateCost(
    betPrice,
    ticketCount,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-5" />
              Custo estimado
            </CardTitle>

            <CardDescription>
              Valor calculado com o preço vigente.
            </CardDescription>
          </div>

          <Badge variant="secondary">
            {numbersPerBet} dezenas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Valor por cartão
            </p>

            <p className="mt-1 text-lg font-semibold">
              {PricingService.formatCurrency(
                calculation.unitPrice,
              )}
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Quantidade
            </p>

            <p className="mt-1 text-lg font-semibold">
              {calculation.ticketCount}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs opacity-80">Custo total</p>

          <p className="mt-1 text-2xl font-bold">
            {PricingService.formatCurrency(
              calculation.totalCost,
            )}
          </p>

          <p className="mt-1 text-xs opacity-80">
            {calculation.ticketCount} cartão(ões) ×{' '}
            {PricingService.formatCurrency(
              calculation.unitPrice,
            )}
          </p>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0" />

          <div>
            <p>
              Vigente desde{' '}
              {PricingService.formatDate(
                betPrice.validFrom,
              )}
            </p>

            <p>
              Fonte: {betPrice.sourceName}. Conferido em{' '}
              {PricingService.formatDateTime(
                betPrice.checkedAt,
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}