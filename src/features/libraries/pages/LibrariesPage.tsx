import { useState } from 'react'
import {
  AlertCircle,
  Folder,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
} from 'lucide-react'

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
import { SubscriberGate } from '@/features/auth/components/SubscriberGate'
import {
  useCreateLibrary,
  useLibraries,
} from '@/features/libraries/hooks/useLibraries'

export function LibrariesPage() {
  const [showForm, setShowForm] = useState(false)
  const [showSubscriberMessage, setShowSubscriberMessage] =
    useState(false)
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

  function handleOpenForm() {
    setShowSubscriberMessage(false)
    setShowForm(true)
  }

  function handleBlockedAccess() {
    setShowForm(false)
    setShowSubscriberMessage(true)
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

            <SubscriberGate
              fallback={
                <Button
                  type="button"
                  onClick={handleBlockedAccess}
                >
                  <Lock className="size-4" />
                  Nova biblioteca
                </Button>
              }
            >
              <Button
                type="button"
                onClick={handleOpenForm}
                disabled={showForm}
              >
                <Plus className="size-4" />
                Nova biblioteca
              </Button>
            </SubscriberGate>
          </div>
        </div>

        {showSubscriberMessage && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Lock className="mt-0.5 size-5 text-amber-600" />

              <div>
                <p className="font-medium">
                  Funcionalidade exclusiva para assinantes
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  A criação de bibliotecas e o salvamento de jogos
                  estão disponíveis apenas para usuários assinantes.
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
                <Card key={library.id}>
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