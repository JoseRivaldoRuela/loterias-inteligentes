import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  RefreshCw,
  Sparkles,
  BarChart3,
  Trash2,
  Plus,
} from 'lucide-react'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LotteryFactory } from '@/core/lottery/LotteryFactory'
import { LotteryEngine } from '@/core/lottery/LotteryEngine'
import {
  RandomStrategy,
  type GeneratedTicket,
} from '@/core/strategies/RandomStrategy'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { CostSummary } from '@/features/pricing/components/CostSummary'
import { useLibraries } from '@/features/libraries/hooks/useLibraries'
import { useCreateLibrary } from '@/features/libraries/hooks/useLibraries'
import { useSaveGeneratedGame } from '@/features/saved-games/hooks/useSaveGeneratedGame'
import {
  StatisticalSuggestionService,
  type StatisticalSuggestion,
} from '@/features/generator/services/StatisticalSuggestionService'
import {
  exportTicketsAsExcel,
  exportTicketsAsPdf,
} from '@/lib/export'

export type GeneratorMode = 'automatic' | 'dark' | 'manual'

export function GeneratorPage({ mode = 'automatic' }: { mode?: GeneratorMode }) {
  const navigate = useNavigate()
  const {
    data: lotteries = [],
    isLoading,
    isError,
    error: lotteriesError,
  } = useLotteries()

  const {
    data: libraries = [],
  } = useLibraries()

  const [selectedLotteryId, setSelectedLotteryId] = useState('')
  const [ticketCount, setTicketCount] = useState(50)
  const [numbersPerTicket, setNumbersPerTicket] = useState(15)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [tickets, setTickets] = useState<GeneratedTicket[]>([])
  const [selectedTicketIndexes, setSelectedTicketIndexes] = useState<number[]>([])
  const [assembledTickets, setAssembledTickets] = useState<GeneratedTicket[]>([])
  const [manualTicketSize, setManualTicketSize] = useState(15)
  const [manualTicketNumbers, setManualTicketNumbers] = useState<number[]>([])
  const [statisticalNumberCount, setStatisticalNumberCount] = useState(15)
  const [statisticalGameCount, setStatisticalGameCount] = useState(1)
  const [statisticalStartDate, setStatisticalStartDate] = useState(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 1)
    return date.toISOString().slice(0, 10)
  })
  const [statisticalEndDate, setStatisticalEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [statisticalSuggestion, setStatisticalSuggestion] = useState<StatisticalSuggestion | null>(null)
  const [statisticalHistory, setStatisticalHistory] = useState<Record<string, number[][]>>({})
  const [statisticalLoading, setStatisticalLoading] = useState(false)
  const [statisticalError, setStatisticalError] = useState('')
  const [message, setMessage] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveLibraryId, setSaveLibraryId] = useState('')
  const [showCreateLibraryForm, setShowCreateLibraryForm] = useState(false)
  const [createLibraryName, setCreateLibraryName] = useState('')
  const [createLibraryDescription, setCreateLibraryDescription] = useState('')
  const [createLibraryError, setCreateLibraryError] = useState('')
  const [contestFrom, setContestFrom] = useState('')
  const [contestTo, setContestTo] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveDestination, setSaveDestination] = useState<'library' | 'pool'>('library')

  useEffect(() => {
    if (!saveLibraryId && libraries.length > 0) {
      setSaveLibraryId(libraries[0].id)
    }
  }, [libraries, saveLibraryId])

  const createLibrary = useCreateLibrary()

  const saveGeneratedGame = useSaveGeneratedGame()

  const effectiveLotteryId =
    selectedLotteryId || lotteries.at(0)?.id || ''

  const selectedLottery = useMemo(
    () =>
      lotteries.find(
        (lottery) => lottery.id === effectiveLotteryId,
      ) ?? null,
    [effectiveLotteryId, lotteries],
  )

  const availableNumbers = useMemo(() => {
    if (!selectedLottery) {
      return []
    }

    const config = LotteryFactory.create(selectedLottery)

    return LotteryEngine.getAvailableNumbers(config)
  }, [selectedLottery])

  useEffect(() => {
    if (!selectedLottery) {
      return
    }

    setSelectedLotteryId(selectedLottery.id)
    setNumbersPerTicket(selectedLottery.minimumBet)
    setManualTicketSize(selectedLottery.minimumBet)
    setStatisticalNumberCount(selectedLottery.minimumBet)
    setStatisticalSuggestion(null)
    setManualTicketNumbers([])
    setStatisticalSuggestion(null)
    setSelectedNumbers(availableNumbers)
    setTickets([])
    setMessage('')
  }, [selectedLottery?.id, availableNumbers])

  function clearGeneratedTickets() {
    setTickets([])
    setSelectedTicketIndexes([])
    setMessage('')
  }

  function handleLotteryChange(lotteryId: string) {
    setSelectedLotteryId(lotteryId)
    clearGeneratedTickets()
    setAssembledTickets([])
    setManualTicketNumbers([])
  }

  function handleTicketCountChange(value: number) {
    setTicketCount(value)
    clearGeneratedTickets()
  }

  function handleNumbersPerTicketChange(value: number) {
    setNumbersPerTicket(value)
    clearGeneratedTickets()
  }

  function toggleNumber(number: number) {
    setSelectedNumbers((currentNumbers) => {
      if (currentNumbers.includes(number)) {
        return currentNumbers.filter(
          (currentNumber) => currentNumber !== number,
        )
      }

      return [...currentNumbers, number]
    })

    clearGeneratedTickets()
  }

  function selectAllNumbers() {
    setSelectedNumbers(availableNumbers)
    clearGeneratedTickets()
  }

  function clearNumbers() {
    setSelectedNumbers([])
    clearGeneratedTickets()
  }

  function sortSelectedNumbers() {
    setSelectedNumbers((currentNumbers) =>
      [...currentNumbers].sort((first, second) => first - second),
    )

    clearGeneratedTickets()
  }

  function reverseSelectedNumbers() {
    setSelectedNumbers((currentNumbers) =>
      [...currentNumbers].reverse(),
    )

    clearGeneratedTickets()
  }

  function moveSelectedNumber(index: number, direction: -1 | 1) {
    const destinationIndex = index + direction

    if (
      destinationIndex < 0 ||
      destinationIndex >= selectedNumbers.length
    ) {
      return
    }

    setSelectedNumbers((currentNumbers) => {
      const reorderedNumbers = [...currentNumbers]

      ;[
        reorderedNumbers[index],
        reorderedNumbers[destinationIndex],
      ] = [
        reorderedNumbers[destinationIndex],
        reorderedNumbers[index],
      ]

      return reorderedNumbers
    })

    clearGeneratedTickets()
  }

  function removeSelectedNumber(number: number) {
    setSelectedNumbers((currentNumbers) =>
      currentNumbers.filter(
        (currentNumber) => currentNumber !== number,
      ),
    )

    clearGeneratedTickets()
  }

  function handleGenerate() {
    setMessage('')

    if (!selectedLottery) {
      setMessage('Selecione uma loteria.')
      return
    }

    try {
      const config = LotteryFactory.create(selectedLottery)

      const generatedTickets = RandomStrategy.generate(config, {
        ticketCount,
        numbersPerTicket,
        selectedNumbers,
        allowDuplicateTickets: false,
      })

      setTickets(generatedTickets)
      setSelectedTicketIndexes([])

      setMessage(
        `${generatedTickets.length} cartões gerados com ` +
          `${selectedNumbers.length} dezenas na sequência definida.`,
      )
    } catch (error) {
      setTickets([])

      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar os cartões.',
      )
    }
  }

  function toggleGeneratedTicket(index: number) {
    setSelectedTicketIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }

  function addSelectedTickets() {
    const selected = tickets.filter((_, index) => selectedTicketIndexes.includes(index))
    if (selected.length === 0) return
    setAssembledTickets((current) => {
      const known = new Set(current.map((ticket) => [...ticket.numbers].sort((a, b) => a - b).join('-')))
      return [...current, ...selected.filter((ticket) => {
        const key = [...ticket.numbers].sort((a, b) => a - b).join('-')
        if (known.has(key)) return false
        known.add(key)
        return true
      })]
    })
    setSelectedTicketIndexes([])
    setMessage(`${selected.length} cartão(ões) adicionado(s) ao jogo alternado.`)
  }

  function toggleManualNumber(number: number) {
    setManualTicketNumbers((current) => {
      if (current.includes(number)) return current.filter((item) => item !== number)
      if (current.length >= manualTicketSize) return current
      return [...current, number]
    })
  }

  function addManualTicket() {
    if (!selectedLottery || manualTicketSize < selectedLottery.minimumBet || manualTicketSize > selectedLottery.maximumBet) {
      setMessage(`Informe uma quantidade entre ${selectedLottery?.minimumBet ?? 1} e ${selectedLottery?.maximumBet ?? 1} dezenas.`)
      return
    }
    if (manualTicketNumbers.length !== manualTicketSize) {
      setMessage(`Escolha exatamente ${manualTicketSize} dezenas para este cartão.`)
      return
    }
    const canonicalKey = [...manualTicketNumbers].sort((a, b) => a - b).join('-')
    const duplicate = assembledTickets.some(
      (ticket) => [...ticket.numbers].sort((a, b) => a - b).join('-') === canonicalKey,
    )
    if (duplicate) {
      setMessage('Este cartão já foi adicionado ao jogo.')
      return
    }
    setAssembledTickets((current) => [...current, { numbers: [...manualTicketNumbers].sort((a, b) => a - b) }])
    setManualTicketNumbers([])
    setMessage(`Cartão manual de ${manualTicketSize} dezenas adicionado.`)
  }

  async function generateStatisticalSuggestion() {
    if (!selectedLottery) return
    setStatisticalLoading(true)
    setStatisticalError('')
    setStatisticalSuggestion(null)
    try {
      const suggestion = await StatisticalSuggestionService.suggest(
        selectedLottery,
        statisticalNumberCount,
        statisticalStartDate,
        statisticalEndDate,
        statisticalHistory[selectedLottery.id] ?? [],
        statisticalGameCount,
      )
      setStatisticalSuggestion(suggestion)
      setStatisticalHistory((current) => ({
        ...current,
        [selectedLottery.id]: [...(current[selectedLottery.id] ?? []), ...suggestion.games].slice(-3),
      }))
    } catch (caught) {
      setStatisticalError(caught instanceof Error ? caught.message : 'Não foi possível analisar os concursos.')
    } finally {
      setStatisticalLoading(false)
    }
  }

  function addStatisticalSuggestion() {
    if (!statisticalSuggestion) return
    setAssembledTickets((current) => {
      const existing = new Set(current.map((ticket) => [...ticket.numbers].sort((a, b) => a - b).join('-')))
      const additions = statisticalSuggestion.games
        .filter((game) => !existing.has(game.join('-')))
        .map((numbers) => ({ numbers }))
      return [...current, ...additions]
    })
    setMessage(`${statisticalSuggestion.games.length} sugestão(ões) estatística(s) adicionada(s) ao jogo.`)
  }

  const suggestedTickets: GeneratedTicket[] = statisticalSuggestion?.games.map((numbers) => ({ numbers })) ?? []
  const ticketsToUse = assembledTickets.length > 0
    ? assembledTickets
    : mode === 'dark' && suggestedTickets.length > 0
      ? suggestedTickets
      : tickets

  function openSave(destination: 'library' | 'pool') {
    setSaveDestination(destination)
    setSaveError('')
    if (!saveName.trim()) {
      const suffix = mode === 'dark' ? 'no escuro' : mode === 'manual' ? 'manual' : 'gerado'
      setSaveName(`${selectedLottery?.name ?? 'Jogo'} ${suffix}`)
    }
    setSaveModalOpen(true)
  }

  function handleExportTickets(format: 'excel' | 'pdf') {
    if (ticketsToUse.length === 0 || !selectedLottery) {
      return
    }

    const fileName = `gerador_${selectedLottery.name}_${new Date()
      .toISOString()
      .slice(0, 10)}`
    const title = `Jogo gerado - ${selectedLottery.name}`
    const description = `Sequência: ${selectedNumbers
      .map((number) => String(number).padStart(2, '0'))
      .join(', ')}`
    const data = ticketsToUse.map((ticket) => ticket.numbers)

    if (format === 'excel') {
      exportTicketsAsExcel(fileName, title, description, data)
    } else {
      exportTicketsAsPdf(fileName, title, description, data)
    }
  }

  async function handleCopyTickets() {
    if (ticketsToUse.length === 0) {
      return
    }

    const content = ticketsToUse
      .map(
        (ticket, index) =>
          `${String(index + 1).padStart(3, '0')}: ${ticket.numbers
            .map((number) => String(number).padStart(2, '0'))
            .join(' - ')}`,
      )
      .join('\n')

    try {
      await navigator.clipboard.writeText(content)
      setMessage('Cartões copiados para a área de transferência.')
    } catch {
      setMessage('Não foi possível copiar os cartões.')
    }
  }

  async function handleSaveGeneratedGame(): Promise<void> {
    if (!selectedLottery) {
      setSaveError('Selecione uma loteria para salvar o jogo.')
      return
    }

    if (ticketsToUse.length === 0) {
      setSaveError('Gere os cartões antes de salvar o jogo.')
      return
    }

    if (!saveName.trim()) {
      setSaveError('Informe um nome para o jogo salvo.')
      return
    }

    setSaveError('')

    try {
      const savedGame = await saveGeneratedGame.mutateAsync({
        lotteryId: selectedLottery.id,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        selectedNumbers: [...new Set(ticketsToUse.flatMap((ticket) => ticket.numbers))].sort((a, b) => a - b),
        ticketSize: Math.min(...ticketsToUse.map((ticket) => ticket.numbers.length)),
        tickets: ticketsToUse.map((ticket) => ticket.numbers),
        libraryId: saveLibraryId || null,
        contestFrom: contestFrom.trim() || null,
        contestTo: contestTo.trim() || null,
      })

      setSaveModalOpen(false)
      setSaveName('')
      setSaveDescription('')
      setSaveLibraryId(libraries[0]?.id ?? '')
      setContestFrom('')
      setContestTo('')
      setMessage('Jogo salvo com sucesso.')
      setAssembledTickets([])
      if (saveDestination === 'pool') {
        navigate(`/boloes?jogo=${savedGame.id}`)
      }
    } catch (saveError) {
      setSaveError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar o jogo.',
      )
    }
  }

  const validTicketCount =
    Number.isInteger(ticketCount) && ticketCount > 0
      ? ticketCount
      : 0

  return (
    <AppLayout>
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gerador
          </h1>

          <p className="text-sm text-muted-foreground">
            Cada modalidade de criação está em uma tela separada para facilitar o uso no celular.
          </p>
        </div>

        <nav className="grid gap-2 rounded-xl border bg-background p-2 sm:grid-cols-3" aria-label="Modalidades do gerador">
          {[
            { value: 'automatic', path: '/gerador', label: 'Gerador', description: 'Cartões automáticos com dezenas escolhidas.' },
            { value: 'dark', path: '/gerador/escuro', label: 'Jogo no escuro', description: 'Sugestões baseadas nas estatísticas.' },
            { value: 'manual', path: '/gerador/manual', label: 'Montagem manual', description: 'Cartões livres e com tamanhos alternados.' },
          ].map((item) => (
            <Button key={item.value} variant={mode === item.value ? 'default' : 'ghost'} className="h-auto justify-start px-4 py-3 text-left" render={<Link to={item.path} />}>
              <span>
                <span className="block font-semibold">{item.label}</span>
                <span className={`block text-xs ${mode === item.value ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{item.description}</span>
              </span>
            </Button>
          ))}
        </nav>

        {mode !== 'automatic' && !isLoading && !isError && (
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
              <div className="space-y-2">
                <Label htmlFor="modeLottery">Loteria</Label>
                <select id="modeLottery" value={effectiveLotteryId} onChange={(event) => handleLotteryChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-foreground">As quantidades permitidas e as dezenas disponíveis mudam automaticamente conforme a loteria.</p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <RefreshCw className="size-5 animate-spin" />

              <p className="text-sm text-muted-foreground">
                Carregando loterias...
              </p>
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card className="border-destructive/40">
            <CardContent className="p-6 text-destructive">
              {lotteriesError instanceof Error
                ? lotteriesError.message
                : 'Não foi possível carregar as loterias.'}
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (
          <>
            {mode === 'automatic' && <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuração</CardTitle>

                    <CardDescription>
                      Defina a loteria e a quantidade de cartões.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="lottery">Loteria</Label>

                      <select
                        id="lottery"
                        value={effectiveLotteryId}
                        onChange={(event) =>
                          handleLotteryChange(event.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {lotteries.map((lottery) => (
                          <option key={lottery.id} value={lottery.id}>
                            {lottery.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticketCount">
                        Quantidade de cartões
                      </Label>

                      <Input
                        id="ticketCount"
                        type="number"
                        min={1}
                        max={1000}
                        value={ticketCount}
                        onChange={(event) =>
                          handleTicketCountChange(
                            Number(event.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numbersPerTicket">
                        Dezenas por cartão
                      </Label>

                      <Input
                        id="numbersPerTicket"
                        type="number"
                        min={selectedLottery?.minimumBet ?? 1}
                        max={selectedLottery?.maximumBet ?? 1}
                        value={numbersPerTicket}
                        onChange={(event) =>
                          handleNumbersPerTicketChange(
                            Number(event.target.value),
                          )
                        }
                      />

                      {selectedLottery && (
                        <p className="text-xs text-muted-foreground">
                          Permitido: {selectedLottery.minimumBet} a{' '}
                          {selectedLottery.maximumBet} dezenas.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm font-medium">
                        Sequência-base
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        As dezenas presentes nos cartões respeitarão a
                        ordem definida por você.
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleGenerate}
                      disabled={
                        !selectedLottery ||
                        validTicketCount === 0 ||
                        selectedNumbers.length < numbersPerTicket
                      }
                    >
                      <Sparkles className="size-4" />
                      Gerar cartões
                    </Button>

                    {message && (
                      <p className="rounded-lg bg-muted p-3 text-sm">
                        {message}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {selectedLottery && (
                  <CostSummary
                    lotteryId={selectedLottery.id}
                    numbersPerBet={numbersPerTicket}
                    ticketCount={validTicketCount}
                  />
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Seleção e sequência</CardTitle>

                  <CardDescription>
                    {selectedNumbers.length} de{' '}
                    {availableNumbers.length} dezenas selecionadas. A
                    ordem abaixo será preservada dentro dos cartões.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllNumbers}
                    >
                      Selecionar todas
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearNumbers}
                    >
                      Limpar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={sortSelectedNumbers}
                    >
                      Ordem crescente
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={reverseSelectedNumbers}
                    >
                      Inverter ordem
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableNumbers.map((number) => {
                      const selectionIndex =
                        selectedNumbers.indexOf(number)

                      const selected = selectionIndex >= 0

                      return (
                        <button
                          key={number}
                          type="button"
                          onClick={() => toggleNumber(number)}
                          className={`relative flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background hover:bg-muted'
                          }`}
                        >
                          {String(number).padStart(2, '0')}

                          {selected && (
                            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">
                              {selectionIndex + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Ordem definida pelo usuário
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Exemplo: 25 - 01 - 14 - 10 - 22 - 19...
                    </p>

                    {selectedNumbers.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma dezena selecionada.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                        {selectedNumbers.map((number, index) => (
                          <div
                            key={number}
                            className="flex items-center gap-2 rounded-lg border p-2"
                          >
                            <Badge
                              variant="secondary"
                              className="w-10 justify-center"
                            >
                              {index + 1}ª
                            </Badge>

                            <span className="flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                              {String(number).padStart(2, '0')}
                            </span>

                            <div className="ml-auto flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Mover para cima"
                                disabled={index === 0}
                                onClick={() =>
                                  moveSelectedNumber(index, -1)
                                }
                              >
                                <ArrowUp className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Mover para baixo"
                                disabled={
                                  index ===
                                  selectedNumbers.length - 1
                                }
                                onClick={() =>
                                  moveSelectedNumber(index, 1)
                                }
                              >
                                <ArrowDown className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remover dezena"
                                onClick={() =>
                                  removeSelectedNumber(number)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>}

            {mode === 'dark' && selectedLottery && (
              <Card className="border-violet-500/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="size-5" /> Jogo no escuro</CardTitle>
                  <CardDescription>
                    Escolha o período e a quantidade. A sugestão combina frequência histórica (80%), atraso recente (20%) e diversidade em relação às sugestões anteriores.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="statisticalNumberCount">Quantidade de dezenas</Label>
                      <Input id="statisticalNumberCount" type="number" min={selectedLottery.minimumBet} max={selectedLottery.maximumBet} value={statisticalNumberCount} onChange={(event) => setStatisticalNumberCount(Number(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statisticalGameCount">Quantidade de jogos</Label>
                      <Input id="statisticalGameCount" type="number" min={1} max={20} value={statisticalGameCount} onChange={(event) => setStatisticalGameCount(Number(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statisticalStartDate">Início do período</Label>
                      <Input id="statisticalStartDate" type="date" value={statisticalStartDate} max={statisticalEndDate} onChange={(event) => setStatisticalStartDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statisticalEndDate">Fim do período</Label>
                      <Input id="statisticalEndDate" type="date" value={statisticalEndDate} min={statisticalStartDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setStatisticalEndDate(event.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={() => void generateStatisticalSuggestion()} disabled={statisticalLoading}>
                      {statisticalLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {statisticalLoading ? 'Analisando concursos...' : 'Sugerir dezenas'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Sugestões consecutivas repetem no máximo cerca de 25% das dezenas, salvo quando a repetição for matematicamente inevitável.</p>
                  </div>

                  {statisticalError && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{statisticalError}</p>}

                  {statisticalSuggestion && (
                    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">Sugestão baseada em {statisticalSuggestion.drawCount} concursos</p>
                          <p className="text-xs text-muted-foreground">Concursos {statisticalSuggestion.firstContest} a {statisticalSuggestion.lastContest} • dados de {statisticalSuggestion.firstDrawDate} a {statisticalSuggestion.lastDrawDate}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={addStatisticalSuggestion}><Plus className="size-4" /> Adicionar à montagem</Button>
                          <Button type="button" variant="secondary" onClick={() => openSave('library')}>Salvar na biblioteca</Button>
                          <Button type="button" onClick={() => openSave('pool')}>Criar bolão</Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {statisticalSuggestion.games.map((game, gameIndex) => (
                          <div key={`statistical-game-${gameIndex}`} className="rounded-lg border bg-background p-3">
                            <p className="mb-2 text-sm font-medium">Jogo {gameIndex + 1}</p>
                            <div className="flex flex-wrap gap-2">
                              {game.map((number) => {
                                const statistic = statisticalSuggestion.statistics.find((item) => item.number === number)!
                                return (
                                  <div key={`suggested-${gameIndex}-${number}`} className="flex flex-col items-center gap-1">
                                    <span className="flex size-12 items-center justify-center rounded-full bg-violet-600 font-semibold text-white">{String(number).padStart(2, '0')}</span>
                                    <span className="text-[10px] text-muted-foreground">{statistic.appearances}x</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === 'manual' && selectedLottery && (
              <Card>
                <CardHeader>
                  <CardTitle>Montar cartão manualmente</CardTitle>
                  <CardDescription>
                    Defina o tamanho e escolha livremente as dezenas de cada cartão. Depois, repita para montar o jogo alternado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="manualTicketSize">Dezenas neste cartão</Label>
                      <Input
                        id="manualTicketSize"
                        type="number"
                        min={selectedLottery.minimumBet}
                        max={selectedLottery.maximumBet}
                        value={manualTicketSize}
                        onChange={(event) => {
                          const nextSize = Number(event.target.value)
                          setManualTicketSize(nextSize)
                          setManualTicketNumbers((current) => current.slice(0, Math.max(0, nextSize)))
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Badge variant="secondary">{manualTicketNumbers.length} de {manualTicketSize} escolhidas</Badge>
                      <Button type="button" variant="outline" onClick={() => setManualTicketNumbers([])}>Limpar</Button>
                      <Button
                        type="button"
                        disabled={manualTicketNumbers.length !== manualTicketSize || manualTicketSize < selectedLottery.minimumBet || manualTicketSize > selectedLottery.maximumBet}
                        onClick={addManualTicket}
                      >
                        <Plus className="size-4" /> Adicionar este cartão
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableNumbers.map((number) => {
                      const selected = manualTicketNumbers.includes(number)
                      return (
                        <button
                          key={`manual-${number}`}
                          type="button"
                          onClick={() => toggleManualNumber(number)}
                          className={`flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background hover:bg-muted'
                          }`}
                        >
                          {String(number).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {assembledTickets.length > 0 && (
              <Card className="border-primary/40">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Jogo alternado</CardTitle>
                      <CardDescription>
                        {assembledTickets.length} cartão(ões) selecionado(s):{' '}
                        {[...new Set(assembledTickets.map((ticket) => ticket.numbers.length))]
                          .sort((a, b) => a - b).map((size) => `${size} dezenas`).join(', ')}.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => openSave('library')}>Salvar na biblioteca</Button>
                      <Button type="button" onClick={() => openSave('pool')}>Criar bolão</Button>
                      <Button type="button" variant="outline" onClick={() => setAssembledTickets([])}><Trash2 className="size-4" /> Limpar</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {assembledTickets.map((ticket, index) => (
                    <div key={`${index}-${ticket.numbers.join('-')}`} className="flex items-center gap-3 rounded-lg border p-3">
                      <Badge variant="secondary">{ticket.numbers.length} dezenas</Badge>
                      <span className="min-w-0 flex-1 text-sm">{ticket.numbers.map((number) => String(number).padStart(2, '0')).join(' - ')}</span>
                      <Button type="button" size="icon" variant="ghost" aria-label="Remover cartão" onClick={() => setAssembledTickets((current) => current.filter((_, position) => position !== index))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {mode === 'automatic' && <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Cartões gerados</CardTitle>

                    <CardDescription>
                      {tickets.length === 0
                        ? 'Nenhum cartão gerado.'
                        : `${tickets.length} cartão(ões) gerado(s).`}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={selectedTicketIndexes.length === 0}
                      onClick={addSelectedTickets}
                    >
                      <Plus className="size-4" />
                      Adicionar ao jogo ({selectedTicketIndexes.length})
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={ticketsToUse.length === 0}
                      onClick={() => void handleCopyTickets()}
                    >
                      <Copy className="size-4" />
                      Copiar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={ticketsToUse.length === 0}
                      onClick={() => void handleExportTickets('excel')}
                    >
                      <Download className="size-4" />
                      Excel
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={ticketsToUse.length === 0}
                      onClick={() => void handleExportTickets('pdf')}
                    >
                      <Download className="size-4" />
                      PDF
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={ticketsToUse.length === 0}
                      onClick={() => openSave('library')}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-input bg-background p-4">
                  <p className="text-sm font-semibold">
                    Salvar na biblioteca
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecione a biblioteca onde este jogo deve ser gravado.
                  </p>

                  <div className="mt-3">
                    <Label htmlFor="saveLibrary">Biblioteca</Label>
                    <div className="flex items-center gap-2">
                      <select
                      id="saveLibrary"
                      value={saveLibraryId}
                      onChange={(event) =>
                        setSaveLibraryId(event.target.value)
                      }
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Sem biblioteca</option>
                      {libraries.map((library) => (
                        <option key={library.id} value={library.id}>
                          {library.name}
                        </option>
                      ))}
                    </select>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowCreateLibraryForm(true)}
                        title="Criar nova biblioteca"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {showCreateLibraryForm && (
                    <Card className="mt-3">
                      <CardHeader>
                        <CardTitle>Nova biblioteca</CardTitle>
                        <CardDescription>
                          Crie uma biblioteca para organizar seus jogos.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="new-library-name">Nome</Label>
                          <Input
                            id="new-library-name"
                            value={createLibraryName}
                            onChange={(e) =>
                              setCreateLibraryName(e.target.value)
                            }
                            placeholder="Ex.: Meus jogos 2"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-library-description">
                            Descrição
                          </Label>
                          <Input
                            id="new-library-description"
                            value={createLibraryDescription}
                            onChange={(e) =>
                              setCreateLibraryDescription(e.target.value)
                            }
                            placeholder="Opcional"
                          />
                        </div>

                        {createLibraryError && (
                          <p className="text-sm text-destructive">
                            {createLibraryError}
                          </p>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCreateLibraryForm(false)
                              setCreateLibraryName('')
                              setCreateLibraryDescription('')
                              setCreateLibraryError('')
                            }}
                          >
                            Cancelar
                          </Button>

                          <Button
                            type="button"
                            onClick={async () => {
                              setCreateLibraryError('')
                              try {
                                const created = await createLibrary.mutateAsync({
                                  name: createLibraryName,
                                  description: createLibraryDescription,
                                })

                                setSaveLibraryId(created.id)
                                setShowCreateLibraryForm(false)
                                setCreateLibraryName('')
                                setCreateLibraryDescription('')
                              } catch (err) {
                                setCreateLibraryError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Não foi possível criar a biblioteca.',
                                )
                              }
                            }}
                          >
                            Criar biblioteca
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {tickets.length === 0 ? (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    Nenhum cartão gerado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket, index) => (
                      <article
                        key={`${index}-${ticket.numbers.join('-')}`}
                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0"
                          checked={selectedTicketIndexes.includes(index)}
                          onChange={() => toggleGeneratedTicket(index)}
                          aria-label={`Selecionar cartão ${index + 1}`}
                        />
                        <Badge
                          variant="secondary"
                          className="w-fit shrink-0"
                        >
                          Cartão {index + 1}
                        </Badge>

                        <div className="flex flex-wrap gap-2">
                          {ticket.numbers.map((number) => (
                            <span
                              key={number}
                              className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                            >
                              {String(number).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>}

            <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar jogo gerado</DialogTitle>
                  <DialogDescription>
                    Salve este conjunto de cartões para consultar depois.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="modalSaveLibrary">Biblioteca</Label>
                    <select id="modalSaveLibrary" value={saveLibraryId} onChange={(event) => setSaveLibraryId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Sem biblioteca</option>
                      {libraries.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saveName">Nome do jogo</Label>
                    <Input
                      id="saveName"
                      value={saveName}
                      onChange={(event) => setSaveName(event.target.value)}
                      placeholder="Nome do jogo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="saveDescription">
                      Descrição (opcional)
                    </Label>
                    <Input
                      id="saveDescription"
                      value={saveDescription}
                      onChange={(event) =>
                        setSaveDescription(event.target.value)
                      }
                      placeholder="Observações sobre este jogo"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contestFrom">
                        Concurso inicial
                      </Label>
                      <Input
                        id="contestFrom"
                        type="number"
                        min={0}
                        value={contestFrom}
                        onChange={(event) =>
                          setContestFrom(event.target.value)
                        }
                        placeholder="Ex.: 1234"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contestTo">Concurso final</Label>
                      <Input
                        id="contestTo"
                        type="number"
                        min={0}
                        value={contestTo}
                        onChange={(event) =>
                          setContestTo(event.target.value)
                        }
                        placeholder="Ex.: 1236"
                      />
                    </div>
                  </div>

                  {saveError ? (
                    <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {saveError}
                    </p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSaveModalOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSaveGeneratedGame()}
                    disabled={ticketsToUse.length === 0 || saveGeneratedGame.isPending}
                  >
                    {saveGeneratedGame.isPending ? 'Salvando...' : saveDestination === 'pool' ? 'Salvar e criar bolão' : 'Salvar na biblioteca'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </section>
    </AppLayout>
  )
}
