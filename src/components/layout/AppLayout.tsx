import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Folder,
  Gauge,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  Search,
  Sparkles,
  Trophy,
  Users,
  User,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/context/AuthContext'

type AppLayoutProps = {
  children: ReactNode
}

type MenuItem = { label: string; path: string; icon: typeof Gauge; child?: boolean }

const menuItems: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Gauge },
  { label: 'Loterias', path: '/loterias', icon: Trophy },
  { label: 'Bibliotecas', path: '/bibliotecas', icon: Folder },
  { label: 'Gerador', path: '/gerador', icon: Sparkles },
  { label: 'Jogo no escuro', path: '/gerador/escuro', icon: BarChart3, child: true },
  { label: 'Montagem manual', path: '/gerador/manual', icon: ListChecks, child: true },
  { label: 'Fechamentos', path: '/fechamentos', icon: ListChecks },
  { label: 'Jogos salvos', path: '/salvos', icon: Folder },
  { label: 'Bolões', path: '/boloes', icon: Users },
  { label: 'Conferência', path: '/conferencia/boloes', icon: CheckCircle2 },
  { label: 'Resultados', path: '/resultados', icon: Search },
  { label: 'Estatísticas', path: '/estatisticas', icon: BarChart3 },
  { label: 'Simulações', path: '/simulacoes', icon: ListChecks },
  { label: 'Laboratório', path: '/laboratorio', icon: BrainCircuit },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
]

function SidebarContent() {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold">Loterias Inteligentes</h1>

        <p className="mt-1 text-xs text-slate-400">
          Análise, geração e estratégias
        </p>
      </div>

      <Separator className="bg-slate-800" />

      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map(({ label, path, icon: Icon, child }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/gerador'}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg py-2.5 text-left text-sm transition ${child ? 'pl-9 pr-3 text-xs' : 'px-3'} ${
                isActive
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
        Versão inicial
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut, isSubscriber } = useAuth()

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  const email = user?.email ?? 'Usuário'
  const initials = email.slice(0, 2).toUpperCase()
  const accountType = isSubscriber ? 'Assinante' : 'Usuário gratuito'
  const accountVariant = isSubscriber ? 'default' : 'secondary'

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="lg:hidden"
                    />
                  }
                >
                  <Menu className="size-5" />
                </SheetTrigger>

                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <div>
                <h2 className="text-lg font-semibold">
                  Loterias Inteligentes
                </h2>

                <p className="text-xs text-muted-foreground">
                  Plataforma de análise e geração
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="sm:hidden"
              aria-label="Sair"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="size-4" />
            </Button>

            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto gap-2 px-2 py-1.5"
                    />
                  }
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="text-left">
                    <p className="max-w-48 truncate text-sm font-medium">
                      {email}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={accountVariant}>
                        {accountType}
                      </Badge>
                    </div>
                  </div>

                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem disabled>
                    <User className="size-4" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {email}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={accountVariant}>
                          {accountType}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => void handleSignOut()}>
                    <LogOut className="size-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
