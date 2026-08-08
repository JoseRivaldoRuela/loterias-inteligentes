import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { ArrowRight, Folder, Loader2, Download, Upload } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SavedGameService } from '@/features/closures/services/SavedGameService'
import { useLibraries } from '@/features/libraries/hooks/useLibraries'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { useMoveSavedGameSetToLibrary } from '@/features/saved-games/hooks/useMoveSavedGameSetToLibrary'
import { useSavedGameSets } from '@/features/saved-games/hooks/useSavedGameSets'
import { useSavedGameTickets } from '@/features/saved-games/hooks/useSavedGameTickets'
import { GameImportService } from '@/features/saved-games/services/GameImportService'
import {
  exportTicketsAsExcel,
  exportTicketsAsPdf,
} from '@/lib/export'

export function SavedGamesPage() {
  const { data: savedSets = [], isLoading, isError, error, refetch } = useSavedGameSets()
  const location = useLocation()
  const [selectedGameSetId, setSelectedGameSetId] = useState<string>('')
  const [moveLibraryId, setMoveLibraryId] = useState<string>('')
  const [moveMessage, setMoveMessage] = useState('')
  const [playedContestsText, setPlayedContestsText] = useState('')
  const [contestMessage, setContestMessage] = useState('')
  const [importName, setImportName] = useState('')
  const [importLotteryId, setImportLotteryId] = useState('')
  const [importLibraryId, setImportLibraryId] = useState('')
  const [importContests, setImportContests] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importedTickets, setImportedTickets] = useState<number[][]>([])
  const [importMessage, setImportMessage] = useState('')
  const [importing, setImporting] = useState(false)

  const {
    data: tickets = [],
    isLoading: ticketsLoading,
  } = useSavedGameTickets(selectedGameSetId)

  const { data: libraries = [], isLoading: librariesLoading } = useLibraries()
  const { data: lotteries = [] } = useLotteries()
  const moveSavedGameSet = useMoveSavedGameSetToLibrary()

  useEffect(() => {
    if (!selectedGameSetId) {
      setMoveLibraryId('')
      return
    }

    const selectedSet = savedSets.find(
      (set) => set.id === selectedGameSetId,
    )

    if (selectedSet?.libraryId) {
      setMoveLibraryId(selectedSet.libraryId)
    } else {
      setMoveLibraryId(libraries[0]?.id ?? '')
    }
  }, [selectedGameSetId, savedSets, libraries])

  useEffect(() => {
    const selectedSet = savedSets.find((set) => set.id === selectedGameSetId)
    const contests = selectedSet?.generationParameters.playedContests
    setPlayedContestsText(Array.isArray(contests) ? contests.join(', ') : '')
    setContestMessage('')
  }, [selectedGameSetId, savedSets])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const libraryParam = params.get('libraryId')
    const setParam = params.get('setId')

    if (setParam) {
      setSelectedGameSetId(setParam)
      return
    }

    if (libraryParam) {
      const filtered = savedSets.filter((s) => s.libraryId === libraryParam)
      if (filtered.length > 0) {
        setSelectedGameSetId(filtered[0].id)
      } else {
        setSelectedGameSetId('')
      }
    }
  }, [location.search, savedSets])

  function handleExportSavedTickets(format: 'excel' | 'pdf') {
    if (tickets.length === 0) {
      return
    }

    const selectedSet = savedSets.find(
      (set) => set.id === selectedGameSetId,
    )

    const fileName = `salvos_${selectedSet?.name ?? 'jogos'}_${new Date()
      .toISOString()
      .slice(0, 10)}`
    const title = `Jogo salvo - ${selectedSet?.name ?? 'Detalhado'}`
    const description = selectedSet?.description ?? null
    const data = tickets.map((ticket) => ticket.numbers)

    if (format === 'excel') {
      exportTicketsAsExcel(fileName, title, description, data)
    } else {
      exportTicketsAsPdf(fileName, title, description, data)
    }
  }

  async function handleMoveSavedGame() {
    if (!selectedGameSetId) {
      return
    }

    setMoveMessage('')

    try {
      await moveSavedGameSet.mutateAsync({
        gameSetId: selectedGameSetId,
        libraryId: moveLibraryId || null,
      })

      setMoveMessage('Jogo movido para a biblioteca com sucesso.')
    } catch (saveError) {
      setMoveMessage(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível mover o jogo para a biblioteca.',
      )
    }
  }

  async function handleSavePlayedContests() {
    if (!selectedGameSetId) return
    const contests = [...new Set(playedContestsText.split(/[,;\s]+/).map(Number).filter((number) => Number.isInteger(number) && number > 0))]
    setContestMessage('')
    try {
      await SavedGameService.updatePlayedContests(selectedGameSetId, contests)
      await refetch()
      setContestMessage('Concursos jogados atualizados com sucesso.')
    } catch (saveError) {
      setContestMessage(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar os concursos.')
    }
  }

  async function handleReadImport() {
    const lottery = lotteries.find((item) => item.id === (importLotteryId || lotteries[0]?.id))
    if (!importFile || !lottery) { setImportMessage('Selecione a loteria e o arquivo.'); return }
    setImporting(true); setImportMessage(''); setImportedTickets([])
    try {
      const parsed = await GameImportService.read(importFile, lottery.minimumBet, lottery.maximumBet, lottery.availableNumbers)
      setImportedTickets(parsed)
      if (!importName) setImportName(importFile.name.replace(/\.(pdf|xlsx?)$/i, ''))
      setImportMessage(`${parsed.length} cartão(ões) encontrado(s). Confira a amostra antes de salvar.`)
    } catch (readError) {
      setImportMessage(readError instanceof Error ? readError.message : 'Não foi possível ler o arquivo.')
    } finally { setImporting(false) }
  }

  async function handleSaveImport() {
    const lotteryId = importLotteryId || lotteries[0]?.id
    if (!importFile || !lotteryId || !importName.trim() || importedTickets.length === 0) return
    const contests = [...new Set(importContests.split(/[,;\s]+/).map(Number).filter((number) => Number.isInteger(number) && number > 0))]
    setImporting(true); setImportMessage('')
    try {
      await SavedGameService.saveImportedGames(lotteryId, importName.trim(), importedTickets, importLibraryId || null, contests, importFile.name)
      await refetch()
      setImportFile(null); setImportedTickets([]); setImportName(''); setImportContests('')
      setImportMessage('Arquivo importado e salvo com sucesso.')
    } catch (saveError) {
      setImportMessage(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a importação.')
    } finally { setImporting(false) }
  }

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Jogos salvos
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse jogos gravados para conferência ou reaplicação.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Folder className="size-5" />
            {savedSets.length} jogo(s) salvo(s)
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-5" /> Importar jogos</CardTitle><CardDescription>Importe cartões de PDF, XLS ou XLSX e salve diretamente ou em uma biblioteca.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-2"><Label htmlFor="import-lottery">Loteria</Label><select id="import-lottery" value={importLotteryId || lotteries[0]?.id || ''} onChange={(event) => { setImportLotteryId(event.target.value); setImportedTickets([]) }} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">{lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="import-library">Biblioteca</Label><select id="import-library" value={importLibraryId} onChange={(event) => setImportLibraryId(event.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Somente em Jogos salvos</option>{libraries.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="import-name">Nome do conjunto</Label><Input id="import-name" value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Ex.: Jogos de agosto" /></div><div className="space-y-2"><Label htmlFor="import-contests">Concursos jogados</Label><Input id="import-contests" value={importContests} onChange={(event) => setImportContests(event.target.value)} placeholder="3240, 3242, 3246" /></div></div>
            <div className="flex flex-col gap-3 sm:flex-row"><Input type="file" accept=".pdf,.xls,.xlsx,application/pdf" onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportedTickets([]) }} /><Button variant="outline" onClick={() => void handleReadImport()} disabled={!importFile || importing}>{importing ? 'Lendo...' : 'Ler e revisar'}</Button>{importedTickets.length > 0 && <Button onClick={() => void handleSaveImport()} disabled={importing || !importName.trim()}><Upload className="size-4" /> Salvar importação</Button>}</div>
            {importMessage && <p className="rounded-md bg-muted p-3 text-sm">{importMessage}</p>}
            {importedTickets.length > 0 && <div className="space-y-2"><Label>Amostra dos cartões</Label>{importedTickets.slice(0, 3).map((ticket, index) => <div key={index} className="flex flex-wrap gap-2 rounded-md border p-2"><Badge variant="secondary">Cartão {index + 1}</Badge>{ticket.map((number) => <span key={number} className="text-sm">{String(number).padStart(2, '0')}</span>)}</div>)}{importedTickets.length > 3 && <p className="text-xs text-muted-foreground">E mais {importedTickets.length - 3} cartão(ões).</p>}</div>}
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2 className="size-5 animate-spin" />
              <p>Carregando jogos salvos...</p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="border-destructive/40">
            <CardContent className="p-6 text-destructive">
              {error instanceof Error
                ? error.message
                : 'Não foi possível carregar jogos salvos.'}
            </CardContent>
          </Card>
        ) : savedSets.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Folder className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 font-medium">Nenhum jogo salvo.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Gere e salve um jogo no Gerador ou em Fechamentos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              {savedSets.map((set) => (
                <Card
                  key={set.id}
                  className={`cursor-pointer transition hover:border-primary ${
                    selectedGameSetId === set.id
                      ? 'border-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedGameSetId(set.id)}
                >
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">
                          {set.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {set.sourceType === 'closure'
                            ? 'Fechamento'
                            : 'Gerador'}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {set.ticketCount} cartões
                      </Badge>
                    </div>
                    {set.description && (
                      <p className="text-sm text-muted-foreground">
                        {set.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>C({set.universeSize ?? 0},{set.ticketSize},{set.guaranteeSize ?? 0})</span>
                      <span>{new Date(set.createdAt).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              {selectedGameSetId ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Detalhes do jogo</CardTitle>
                        <CardDescription>
                          {ticketsLoading
                            ? 'Carregando cartões...'
                            : `${tickets.length} cartão(ões) carregado(s)`}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={tickets.length === 0}
                          onClick={() => handleExportSavedTickets('excel')}
                        >
                          <Download className="size-4" />
                          Excel
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={tickets.length === 0}
                          onClick={() => handleExportSavedTickets('pdf')}
                        >
                          <Download className="size-4" />
                          PDF
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="librarySelect">
                          Biblioteca destino
                        </Label>
                        <select
                          id="librarySelect"
                          value={moveLibraryId}
                          onChange={(event) =>
                            setMoveLibraryId(event.target.value)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={librariesLoading || libraries.length === 0}
                        >
                          <option value="">Sem biblioteca</option>
                          {libraries.map((library) => (
                            <option key={library.id} value={library.id}>
                              {library.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Opção</Label>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          disabled={
                            moveSavedGameSet.isPending ||
                            !selectedGameSetId ||
                            libraries.length === 0
                          }
                          onClick={() => void handleMoveSavedGame()}
                        >
                          {moveSavedGameSet.isPending
                            ? 'Movendo...'
                            : 'Mover para biblioteca'}
                        </Button>
                      </div>
                    </div>

                    {moveMessage ? (
                      <p className="rounded-lg bg-muted p-3 text-sm">
                        {moveMessage}
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-lg border p-4">
                      <Label htmlFor="played-contests">Concursos em que este jogo foi apostado</Label>
                      <p className="mt-1 text-xs text-muted-foreground">Informe somente os concursos realmente jogados, separados por vírgula.</p>
                      <div className="mt-3 flex gap-2">
                        <Input id="played-contests" value={playedContestsText} onChange={(event) => setPlayedContestsText(event.target.value)} placeholder="Ex.: 3240, 3242, 3246, 3247" />
                        <Button type="button" onClick={() => void handleSavePlayedContests()}>Salvar concursos</Button>
                      </div>
                      {contestMessage ? <p className="mt-2 text-sm text-muted-foreground">{contestMessage}</p> : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {ticketsLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Carregando cartões...
                      </div>
                    ) : (
                      tickets.map((ticket) => (
                        <article
                          key={ticket.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                        >
                          <Badge variant="secondary">
                            Cartão {ticket.ticketOrder}
                          </Badge>
                          {ticket.numbers.map((number) => (
                            <span
                              key={number}
                              className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                            >
                              {String(number).padStart(2, '0')}
                            </span>
                          ))}
                        </article>
                      ))
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="size-5 text-muted-foreground" />
                      <div>
                        <h2 className="text-sm font-semibold">
                          Selecione um jogo salvo
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Clique em um item à esquerda para ver os cartões.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  )
}
