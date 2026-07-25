import { useAuth } from '@/features/auth/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const menuItems = [
  'Dashboard',
  'Loterias',
  'Gerador',
  'Conferência',
  'Estatísticas',
  'Simulações',
  'Laboratório',
  'Configurações',
]

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
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  return (
    <div className="min-h-screen bg-muted lg:flex">
      <aside className="w-full bg-slate-950 text-white lg:min-h-screen lg:w-64">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-xl font-bold">Loterias Inteligentes</h1>
          <p className="mt-1 text-xs text-slate-400">
            Plataforma de análise e geração
          </p>
        </div>

        <nav className="space-y-1 p-4">
          {menuItems.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                index === 0
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="flex flex-col gap-4 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Visão geral da sua área
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.email ?? 'Usuário'}
            </span>

            <Button variant="outline" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </header>

        <section className="space-y-6 p-6">
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
      </main>
    </div>
  )
}