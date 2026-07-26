import { AlertCircle, RefreshCw, Trophy } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'

export function LotteriesPage() {
  const {
    data: lotteries = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLotteries()

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loterias</h1>
            <p className="text-sm text-muted-foreground">
              Modalidades disponíveis para geração, análise e conferência.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>

        {isLoading && <LotteriesLoading />}

        {isError && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-start gap-3 p-6">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />

              <div>
                <p className="font-medium text-destructive">
                  Não foi possível carregar as loterias.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : 'Ocorreu um erro inesperado.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && lotteries.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <Trophy className="mx-auto size-10 text-muted-foreground" />

              <p className="mt-4 font-medium">
                Nenhuma loteria ativa foi encontrada.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre ou ative uma modalidade no banco de dados.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && lotteries.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lotteries.map((lottery) => (
              <Card key={lottery.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{lottery.name}</CardTitle>
                      <CardDescription>{lottery.code}</CardDescription>
                    </div>

                    <Badge variant="secondary">Ativa</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <LotteryMetric
                      label="Dezenas disponíveis"
                      value={lottery.availableNumbers}
                    />

                    <LotteryMetric
                      label="Dezenas sorteadas"
                      value={lottery.drawnNumbers}
                    />

                    <LotteryMetric
                      label="Aposta mínima"
                      value={lottery.minimumBet}
                    />

                    <LotteryMetric
                      label="Aposta máxima"
                      value={lottery.maximumBet}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium">Faixas de premiação</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {lottery.prizeTiers.map((tier) => (
                        <Badge key={tier.id} variant="outline">
                          {tier.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  )
}

function LotteryMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function LotteriesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-20" />
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((__, metricIndex) => (
                <Skeleton key={metricIndex} className="h-16" />
              ))}
            </div>

            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}