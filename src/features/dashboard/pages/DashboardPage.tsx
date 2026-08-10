import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { useSavedGameSets } from '@/features/saved-games/hooks/useSavedGameSets'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { useCoveringRequests } from '@/features/closures/hooks/useCoveringRequests'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useNavigate } from 'react-router'

export function DashboardPage() {
  const {
    data: savedSets = [],
  } = useSavedGameSets()

  const {
    data: lotteries = [],
  } = useLotteries()

  const {
    data: coveringRequests = [],
  } = useCoveringRequests()

  const summaryCards = [
    {
      title: 'Jogos salvos',
      value: String(savedSets.length ?? 0),
      description: savedSets.length === 0 ? 'Nenhum jogo cadastrado' : `${savedSets.length} jogos salvos`,
    },
    {
      title: 'Simulações',
      value: String(coveringRequests.length ?? 0),
      description: coveringRequests.length === 0 ? 'Nenhuma simulação executada' : `${coveringRequests.length} simulações solicitadas`,
    },
    {
      title: 'Conferências',
      value: String(savedSets.filter((s) => s.sourceType === 'closure').length ?? 0),
      description: 'Jogos de fechamento salvos',
    },
    {
      title: 'Loterias ativas',
      value: String(lotteries.length ?? 0),
      description: lotteries.length === 0 ? 'Nenhuma loteria cadastrada' : `${lotteries.length} loterias`,
    },
  ]

  const navigate = useNavigate()

  function handleCardClick(key: string) {
    switch (key) {
      case 'Jogos salvos':
        navigate('/salvos')
        break
      case 'Simulações':
        navigate('/fechamentos')
        break
      case 'Conferências':
        navigate('/fechamentos')
        break
      case 'Loterias ativas':
        navigate('/loterias')
        break
      default:
        break
    }
  }

  const recentActivities = [
    ...(savedSets ?? []).map((s) => ({
      id: s.id,
      type: s.sourceType === 'closure' ? 'Fechamento' : 'Gerador',
      title: s.name,
      date: s.createdAt,
    })),
    ...(coveringRequests ?? []).map((r) => ({
      id: r.id,
      type: 'Solicitação',
      title: `Fechamento ${r.lotteryId}`,
      date: r.requestedAt,
    })),
  ]

  recentActivities.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="cursor-pointer" onClick={() => handleCardClick(card.title)}>
              <CardHeader className="pb-2">
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-3xl">{card.value}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acesso rápido</CardTitle>
              <CardDescription>
                Atalhos para as principais funcionalidades
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline">Gerar jogos</Button>
              <Button variant="outline">Conferir resultados</Button>
              <Button variant="outline">Importar planilha</Button>
              <Button variant="outline">Abrir laboratório</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>Últimas ações realizadas na sua conta</CardDescription>
            </CardHeader>

            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">Ainda não há atividades registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.slice(0, 6).map((act) => (
                    <div key={act.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{act.title}</p>
                        <p className="text-xs text-muted-foreground">{act.type}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(act.date).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppLayout>
  )
}
 