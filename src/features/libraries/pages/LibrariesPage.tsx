import { useState } from 'react'
import {
  AlertCircle,
  Folder,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useSavedGameSets } from '@/features/saved-games/hooks/useSavedGameSets'
import { useSavedGameSetsByLibrary } from '@/features/saved-games/hooks/useSavedGameSetsByLibrary'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  useCreateLibrary,
  useLibraries,
} from '@/features/libraries/hooks/useLibraries'

export function LibrariesPage() {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const {
    data: libraries = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLibraries()

  const { isSubscriber } = useAuth()

  const {
    data: savedSets = [],
    isLoading: savedSetsLoading,
    isError: savedSetsError,
  } = useSavedGameSets()

  const [openLibraryId, setOpenLibraryId] = useState<string | null>(null)
  const savedSetsByLibrary = useSavedGameSetsByLibrary(openLibraryId)

  const createLibrary = useCreateLibrary()

  async function handleCreateLibrary() {
    setFormError('')

    try {
      await createLibrary.mutateAsync({
        name,
        description,
      })

      setName('')
      setDescription('')
      setShowForm(false)
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Não foi possível criar a biblioteca.',
      )
    }
  }

  const navigate = useNavigate()

  function handleOpenForm() {
    setShowForm(true)
  }

  function handleViewSavedGames() {
    navigate('/salvos')
  }

  function handleCancel() {
    setName('')
    setDescription('')
    setFormError('')
    setShowForm(false)
  }

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Biblioteca de jogos
            </h1>

            <p className="text-sm text-muted-foreground">
              Organize seus jogos salvos em bibliotecas.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`size-4 ${
                  isFetching ? 'animate-spin' : ''
                }`}
              />

              Atualizar
            </Button>

            <Button
              type="button"
              onClick={handleOpenForm}
              disabled={!isSubscriber || showForm}
              title={
                !isSubscriber
                  ? 'Recurso disponível apenas para assinantes'
                  : undefined
              }
            >
              <Lock className="size-4" />
              Nova biblioteca
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jogos salvos</CardTitle>

            <CardDescription>
              Acesse jogos já gravados na plataforma.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {savedSetsLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Carregando jogos salvos...
              </div>
            ) : savedSetsError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar os jogos salvos.
              </p>
            ) : savedSets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum jogo salvo encontrado. Você pode salvar jogos
                gerados ou fechamentos e visualizá-los aqui.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedSets.slice(0, 4).map((set) => (
                    <Card key={set.id}>
                      <CardContent>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {set.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {set.sourceType === 'closure'
                                ? 'Fechamento'
                                : 'Gerador'}
                            </p>
                          </div>
                          <Folder className="size-5 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {set.ticketCount} cartão(ões)
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleViewSavedGames}
                  >
                    Ver todos os jogos salvos
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isSubscriber && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Lock className="mt-0.5 size-5 text-amber-600" />

              <div>
                <p className="font-medium">
                  Recurso disponível apenas para assinantes
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Criar biblioteca e mover jogos para ela são ações
                  reservadas a assinantes. Faça upgrade para usar
                  esta funcionalidade.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova biblioteca</CardTitle>

              <CardDescription>
                Crie uma biblioteca pessoal para organizar seus
                jogos.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="library-name">Nome</Label>

                <Input
                  id="library-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ex.: Jogos da semana"
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="library-description">
                  Descrição
                </Label>

                <Input
                  id="library-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Descrição opcional"
                  maxLength={200}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createLibrary.isPending}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    void handleCreateLibrary()
                  }
                  disabled={
                    createLibrary.isPending ||
                    name.trim().length === 0
                  }
                >
                  {createLibrary.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}

                  Criar biblioteca
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && <LibrariesLoading />}

        {isError && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-start gap-3 p-6">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />

              <div>
                <p className="font-medium text-destructive">
                  Não foi possível carregar as bibliotecas.
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

        {!isLoading &&
          !isError &&
          libraries.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <Folder className="mx-auto size-10 text-muted-foreground" />

                <p className="mt-4 font-medium">
                  Nenhuma biblioteca encontrada.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Crie uma biblioteca para organizar seus jogos.
                </p>
              </CardContent>
            </Card>
          )}

        {!isLoading &&
          !isError &&
          libraries.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {libraries.map((library) => (
                <Card key={library.id} onClick={() => setOpenLibraryId(library.id)} className="cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Folder className="mt-1 size-5 text-muted-foreground" />

                      <div>
                        <CardTitle>{library.name}</CardTitle>

                        <CardDescription>
                          {library.libraryType === 'personal'
                            ? 'Biblioteca pessoal'
                            : 'Biblioteca de bolão'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  {library.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {library.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        {openLibraryId && (
          <Dialog open={!!openLibraryId} onOpenChange={(open) => { if (!open) setOpenLibraryId(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Jogos na biblioteca</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {savedSetsByLibrary.isLoading ? (
                  <p>Carregando jogos...</p>
                ) : savedSetsByLibrary.isError ? (
                  <p className="text-sm text-destructive">Não foi possível carregar os jogos desta biblioteca.</p>
                ) : (savedSetsByLibrary.data?.length ?? 0) === 0 ? (
                  <p>Nenhum jogo salvo nesta biblioteca.</p>
                ) : (
                  <div className="space-y-3">
                    {(savedSetsByLibrary.data ?? []).map((set) => (
                      <Card key={set.id}>
                        <CardContent>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{set.name}</p>
                              <p className="text-xs text-muted-foreground">{set.sourceType === 'closure' ? 'Fechamento' : 'Gerador'}</p>
                            </div>
                            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{set.ticketCount} cartões</span><Button type="button" size="sm" variant="outline" disabled={Boolean(set.bettingPoolId)} onClick={() => { setOpenLibraryId(null); navigate(`/boloes?jogo=${set.id}`) }}><Users className="size-4" />{set.bettingPoolId ? 'No bolão' : 'Adicionar ao bolão'}</Button></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setOpenLibraryId(null)
                        navigate(`/salvos?libraryId=${openLibraryId}`)
                      }}
                    >
                      Ver no Gerenciador de jogos
                    </Button>
                  </div>

                  <div>
                    <Button type="button" onClick={() => setOpenLibraryId(null)}>Fechar</Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </section>
    </AppLayout>
  )
}

function LibrariesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>

          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
