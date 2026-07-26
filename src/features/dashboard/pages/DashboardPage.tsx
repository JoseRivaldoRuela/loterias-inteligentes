import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const summaryCards = [
  {
    title: 'Jogos salvos',
    value: '0',
    description: 'Nenhum jogo cadastrado',
  },
  {
    title: 'Simulações',
    value: '0',
    description: 'Nenhuma simulação executada',
  },
  {
    title: 'Conferências',
    value: '0',
    description: 'Nenhuma conferência realizada',
  },
  {
    title: 'Loterias ativas',
    value: '0',
    description: 'Nenhuma loteria cadastrada',
  },
]

export function DashboardPage() {
  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-3xl">{card.value}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
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
              <CardDescription>
                Últimas ações realizadas na sua conta
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Ainda não há atividades registradas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppLayout>
  )
}