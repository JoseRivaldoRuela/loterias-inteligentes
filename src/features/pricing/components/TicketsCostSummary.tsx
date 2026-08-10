import { useQueries } from '@tanstack/react-query'
import { AlertCircle, Banknote, RefreshCw } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { betPriceQueryKeys } from '@/features/pricing/hooks/useBetPrice'
import { PricingService } from '@/features/pricing/services/PricingService'

type TicketsCostSummaryProps = {
  lotteryId: string
  tickets: number[][]
  totalShares?: number
  compact?: boolean
  multiplier?: number
}

export function TicketsCostSummary({ lotteryId, tickets, totalShares, compact = false, multiplier = 1 }: TicketsCostSummaryProps) {
  const quantities = [...new Set(tickets.map((ticket) => ticket.length))].sort((a, b) => a - b)
  const priceQueries = useQueries({
    queries: quantities.map((size) => ({
      queryKey: betPriceQueryKeys.current(lotteryId, size),
      queryFn: () => PricingService.getCurrentPrice(lotteryId, size),
      enabled: Boolean(lotteryId) && size > 0,
      staleTime: 30 * 60 * 1000,
    })),
  })

  if (tickets.length === 0) return null
  if (priceQueries.some((query) => query.isLoading)) {
    return <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" /> Calculando valor do jogo...</CardContent></Card>
  }

  const missingSizes = quantities.filter((_, index) => !priceQueries[index]?.data)
  if (priceQueries.some((query) => query.isError) || missingSizes.length > 0) {
    return <Card className="border-amber-500/40"><CardContent className="flex items-start gap-2 p-4 text-sm"><AlertCircle className="mt-0.5 size-4 text-amber-600" /><span>Não foi possível calcular o total. Preço não cadastrado para {missingSizes.map((size) => `${size} dezenas`).join(', ') || 'uma das apostas'}.</span></CardContent></Card>
  }

  const rows = quantities.map((size, index) => {
    const count = tickets.filter((ticket) => ticket.length === size).length
    const unitPrice = priceQueries[index].data!.price
    return { size, count, unitPrice, subtotal: count * unitPrice * Math.max(1, multiplier) }
  })
  const total = rows.reduce((sum, row) => sum + row.subtotal, 0)
  const validShares = Number.isInteger(totalShares) && (totalShares ?? 0) > 0 ? totalShares! : 0

  return (
    <Card className="border-emerald-500/40">
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2 text-base"><Banknote className="size-5" /> Valor do jogo</CardTitle>
        <CardDescription>Calculado pelos preços vigentes de cada cartão.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          {multiplier > 1 && <p className="mb-2 text-xs font-medium text-muted-foreground">Os cartões serão jogados em {multiplier} concursos.</p>}
          {rows.map((row) => <div key={row.size} className="flex justify-between gap-3"><span>{row.count} cartão(ões) de {row.size} dezenas</span><span>{row.count} × {multiplier > 1 ? `${multiplier} concursos × ` : ''}{PricingService.formatCurrency(row.unitPrice)} = {PricingService.formatCurrency(row.subtotal)}</span></div>)}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-emerald-600 p-4 text-white">
          <div><p className="text-xs opacity-80">Total do {validShares ? 'bolão' : 'jogo'}</p><p className="text-2xl font-bold">{PricingService.formatCurrency(total)}</p></div>
          {validShares > 0 && <div className="text-right"><p className="text-xs opacity-80">Valor por cota ({validShares})</p><p className="text-lg font-semibold">{PricingService.formatCurrency(total / validShares)}</p></div>}
        </div>
      </CardContent>
    </Card>
  )
}
