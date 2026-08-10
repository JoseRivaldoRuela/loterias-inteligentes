import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Database,
  Download,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
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
import { LotteryEngine } from '@/core/lottery/LotteryEngine'
import { LotteryFactory } from '@/core/lottery/LotteryFactory'
import { useCoveringDesign } from '@/features/closures/hooks/useCoveringDesign'
import { useSaveClosure } from '@/features/closures/hooks/useSavedClosure'
import { CoveringDesignRequestService } from '@/features/closures/services/CoveringDesignRequestService'
import { CoveringDesignService } from '@/features/closures/services/CoveringDesignService'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { useLibraries } from '@/features/libraries/hooks/useLibraries'
import { useCreateLibrary } from '@/features/libraries/hooks/useLibraries'
import { useBetPrice } from '@/features/pricing/hooks/useBetPrice'
import { PricingService } from '@/features/pricing/services/PricingService'
import {
  exportTicketsAsExcel,
  exportTicketsAsPdf,
} from '@/lib/export'

export function ClosuresPage() {
  const {
    data: lotteries = [],
    isLoading: lotteriesLoading,
    isError: lotteriesError,
    error: lotteriesErrorDetails,
  } = useLotteries()

  const {
    data: libraries = [],
  } = useLibraries()
  const personalLibraries = useMemo(() => libraries.filter((library) => library.libraryType === 'personal'), [libraries])

  const [selectedLotteryId, setSelectedLotteryId] = useState('')
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [ticketSize, setTicketSize] = useState(15)
  const [guaranteeSize, setGuaranteeSize] = useState(12)
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([])
  const [saveLibraryId, setSaveLibraryId] = useState('')
  const [showCreateLibraryForm, setShowCreateLibraryForm] = useState(false)
  const [createLibraryName, setCreateLibraryName] = useState('')
  const [createLibraryDescription, setCreateLibraryDescription] = useState('')
  const [createLibraryError, setCreateLibraryError] = useState('')
  const [contestFrom, setContestFrom] = useState('')
  const [contestTo, setContestTo] = useState('')
  const [message, setMessage] = useState('')
  const [requestingDesign, setRequestingDesign] = useState(false)
  const [requestRegistered, setRequestRegistered] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveError, setSaveError] = useState('')

  const saveClosure = useSaveClosure()

  useEffect(() => {
    if ((!saveLibraryId || !personalLibraries.some((library) => library.id === saveLibraryId)) && personalLibraries.length > 0) {
      setSaveLibraryId(personalLibraries[0].id)
    }
  }, [personalLibraries, saveLibraryId])

  const createLibrary = useCreateLibrary()

  const effectiveLotteryId =
    selectedLotteryId || lotteries.at(0)?.id || ''

  const selectedLottery =
    lotteries.find(
      (lottery) => lottery.id === effectiveLotteryId,
    ) ?? null

  const availableNumbers = useMemo(() => {
    if (!selectedLottery) {
      return []
    }

    return LotteryEngine.getAvailableNumbers(
      LotteryFactory.create(selectedLottery),
    )
  }, [selectedLottery])

  const guaranteeOptions = useMemo(() => {
    if (!selectedLottery) {
      return []
    }

    return selectedLottery.prizeTiers
      .map((tier) => tier.hits)
      .filter((hits) => hits <= ticketSize)
      .sort((first, second) => first - second)
  }, [selectedLottery, ticketSize])

  const {
    data: coveringDesign,
    isLoading: coveringLoading,
    isFetching: coveringFetching,
    isError: coveringError,
    error: coveringErrorDetails,
    refetch: refetchCovering,
  } = useCoveringDesign(
    selectedLottery?.id ?? '',
    selectedNumbers.length,
    ticketSize,
    guaranteeSize,
  )

  const {
    data: betPrice,
    isLoading: priceLoading,
    isError: priceError,
  } = useBetPrice(selectedLottery?.id ?? '', ticketSize)

  const previewTicketCount = coveringDesign?.ticketCount ?? 0

  const previewTotalCost =
    betPrice && previewTicketCount > 0
      ? betPrice.price * previewTicketCount
      : null

  const generateButtonLabel = useMemo(() => {
    if (coveringLoading || coveringFetching || priceLoading) {
      return 'Consultando fechamento...'
    }

    if (!coveringDesign) {
      return 'Fechamento indisponível'
    }

    const quantity = coveringDesign.ticketCount.toLocaleString('pt-BR')

    if (!betPrice || priceError) {
      return `Gerar ${quantity} cartões`
    }

    return `Gerar ${quantity} cartões — ${PricingService.formatCurrency(
      betPrice.price * coveringDesign.ticketCount,
    )}`
  }, [
    betPrice,
    coveringDesign,
    coveringFetching,
    coveringLoading,
    priceError,
    priceLoading,
  ])

  useEffect(() => {
    if (!selectedLottery) {
      return
    }

    const configuredUniverse = Number(
      selectedLottery.configuration.defaultClosureUniverse,
    )
    const initialUniverseSize = Math.min(
      Number.isInteger(configuredUniverse) && configuredUniverse >= selectedLottery.minimumBet
        ? configuredUniverse
        : 18,
      selectedLottery.availableNumbers,
    )

    const configuredGuarantee = Number(
      selectedLottery.configuration.defaultGuarantee,
    )
    const defaultGuarantee =
      selectedLottery.prizeTiers.some((tier) => tier.hits === configuredGuarantee)
        ? configuredGuarantee
        : selectedLottery.prizeTiers.some((tier) => tier.hits === 12)
          ? 12
          : selectedLottery.prizeTiers.at(0)?.hits ?? selectedLottery.drawnNumbers

    setSelectedLotteryId(selectedLottery.id)
    setTicketSize(selectedLottery.minimumBet)
    setGuaranteeSize(defaultGuarantee)
    setSelectedNumbers(
      availableNumbers.slice(0, initialUniverseSize),
    )
    setGeneratedTickets([])
    setMessage('')
    setRequestRegistered(false)
  }, [selectedLottery?.id, availableNumbers])

  function clearResult(): void {
    setGeneratedTickets([])
    setMessage('')
    setRequestRegistered(false)
  }

  function handleLotteryChange(lotteryId: string): void {
    setSelectedLotteryId(lotteryId)
    clearResult()
  }

  function handleTicketSizeChange(size: number): void {
    setTicketSize(size)

    if (guaranteeSize > size) {
      setGuaranteeSize(size)
    }

    clearResult()
  }

  function handleGuaranteeChange(size: number): void {
    setGuaranteeSize(size)
    clearResult()
  }

  function toggleNumber(number: number): void {
    setSelectedNumbers((currentNumbers) =>
      currentNumbers.includes(number)
        ? currentNumbers.filter(
            (currentNumber) => currentNumber !== number,
          )
        : [...currentNumbers, number],
    )

    clearResult()
  }

  function selectAllNumbers(): void {
    setSelectedNumbers(availableNumbers)
    clearResult()
  }

  function clearNumbers(): void {
    setSelectedNumbers([])
    clearResult()
  }

  function sortNumbers(): void {
    setSelectedNumbers((currentNumbers) =>
      [...currentNumbers].sort(
        (first, second) => first - second,
      ),
    )

    clearResult()
  }

  function reverseNumbers(): void {
    setSelectedNumbers((currentNumbers) =>
      [...currentNumbers].reverse(),
    )

    clearResult()
  }

  function removeNumber(number: number): void {
    setSelectedNumbers((currentNumbers) =>
      currentNumbers.filter(
        (currentNumber) => currentNumber !== number,
      ),
    )

    clearResult()
  }

  function moveNumber(index: number, direction: -1 | 1): void {
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

    clearResult()
  }

  function handleApplyDesign(): void {
    setGeneratedTickets([])
    setMessage('')

    if (!coveringDesign) {
      setMessage(
        'Não existe uma matriz validada para esta configuração.',
      )
      return
    }

    try {
      const applied =
        CoveringDesignService.applyToSelectedNumbers(
          coveringDesign,
          selectedNumbers,
        )

      setGeneratedTickets(applied.tickets)

      setMessage(
        `${applied.tickets.length} cartões gerados. ` +
          `Garantia de ${coveringDesign.guaranteeSize} acertos validada.`,
      )
    } catch (applicationError) {
      setMessage(
        applicationError instanceof Error
          ? applicationError.message
          : 'Não foi possível aplicar o fechamento.',
      )
    }
  }

  function handleExportClosureTickets(format: 'excel' | 'pdf'): void {
    if (!selectedLottery || generatedTickets.length === 0) {
      return
    }

    const fileName = `fechamento_${selectedLottery.name}_${new Date()
      .toISOString()
      .slice(0, 10)}`
    const title = `Fechamento - ${selectedLottery.name}`
    const description = `C(${selectedNumbers.length}, ${ticketSize}, ${guaranteeSize})`
    const data = generatedTickets

    if (format === 'excel') {
      exportTicketsAsExcel(fileName, title, description, data)
    } else {
      exportTicketsAsPdf(fileName, title, description, data)
    }
  }

  async function handleRequestDesign(): Promise<void> {
    if (!selectedLottery) {
      setMessage('Selecione uma loteria.')
      return
    }

    setRequestingDesign(true)
    setMessage('')

    try {
      await CoveringDesignRequestService.request(
        selectedLottery.id,
        selectedNumbers.length,
        ticketSize,
        guaranteeSize,
      )

      setRequestRegistered(true)

      setMessage(
        `Solicitação do fechamento C(${selectedNumbers.length}, ${ticketSize}, ${guaranteeSize}) registrada. ` +
          'O administrador poderá priorizar esta configuração.',
      )
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar a solicitação.',
      )
    } finally {
      setRequestingDesign(false)
    }
  }

  async function handleSaveClosure(): Promise<void> {
    if (!selectedLottery) {
      setSaveError('Selecione uma loteria para salvar o fechamento.')
      return
    }

    if (generatedTickets.length === 0) {
      setSaveError('Gere o fechamento antes de salvar o jogo.')
      return
    }

    if (!saveName.trim()) {
      setSaveError('Informe um nome para o jogo salvo.')
      return
    }

    setSaveError('')

    try {
      await saveClosure.mutateAsync({
        lotteryId: selectedLottery.id,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        selectedNumbers,
        ticketSize,
        guaranteeSize,
        generatedTickets,
        libraryId: saveLibraryId || null,
        contestFrom: contestFrom.trim() || null,
        contestTo: contestTo.trim() || null,
      })

      setSaveModalOpen(false)
      setSaveName('')
      setSaveDescription('')
      setSaveLibraryId(personalLibraries[0]?.id ?? '')
      setContestFrom('')
      setContestTo('')
      setMessage('Jogo salvo com sucesso.')
    } catch (saveError) {
      setSaveError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar o fechamento.',
      )
    }
  }

  const optimalityLabel = coveringDesign
    ? CoveringDesignService.getOptimalityLabel(
        coveringDesign.optimalityStatus,
      )
    : ''

  return (
    <AppLayout>
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fechamentos
          </h1>

          <p className="text-sm text-muted-foreground">
            Gere cartões utilizando matrizes matematicamente
            verificadas.
          </p>
        </div>

        {lotteriesLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <LoaderCircle className="size-5 animate-spin" />

              <p className="text-sm text-muted-foreground">
                Carregando loterias...
              </p>
            </CardContent>
          </Card>
        )}

        {lotteriesError && (
          <Card className="border-destructive/40">
            <CardContent className="flex gap-3 p-6">
              <AlertCircle className="size-5 text-destructive" />

              <p className="text-sm text-destructive">
                {lotteriesErrorDetails instanceof Error
                  ? lotteriesErrorDetails.message
                  : 'Não foi possível carregar as loterias.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!lotteriesLoading &&
          !lotteriesError &&
          selectedLottery && (
            <>
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        1. Configure o fechamento
                      </CardTitle>

                      <CardDescription>
                        O número de cartões e o valor aparecem quando
                        houver uma matriz disponível.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="closureLottery">
                          Loteria
                        </Label>

                        <select
                          id="closureLottery"
                          value={effectiveLotteryId}
                          onChange={(event) =>
                            handleLotteryChange(
                              event.target.value,
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {lotteries.map((lottery) => (
                            <option
                              key={lottery.id}
                              value={lottery.id}
                            >
                              {lottery.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticketSize">
                          Dezenas em cada cartão
                        </Label>

                        <select
                          id="ticketSize"
                          value={ticketSize}
                          onChange={(event) =>
                            handleTicketSizeChange(
                              Number(event.target.value),
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {Array.from(
                            {
                              length:
                                selectedLottery.maximumBet -
                                selectedLottery.minimumBet +
                                1,
                            },
                            (_, index) =>
                              selectedLottery.minimumBet + index,
                          ).map((size) => (
                            <option key={size} value={size}>
                              {size} dezenas
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guaranteeSize">
                          Acertos que desejo garantir
                        </Label>

                        <select
                          id="guaranteeSize"
                          value={guaranteeSize}
                          onChange={(event) =>
                            handleGuaranteeChange(
                              Number(event.target.value),
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {guaranteeOptions.map((hits) => (
                            <option key={hits} value={hits}>
                              Garantir {hits} acertos
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-950">
                        <p className="font-semibold">
                          Fechamento solicitado
                        </p>

                        <p className="mt-2 leading-6">
                          Covering Design{' '}
                          <strong>
                            C({selectedNumbers.length},{' '}
                            {ticketSize}, {guaranteeSize})
                          </strong>
                        </p>

                        {coveringDesign && (
                          <div className="mt-3 border-t border-blue-200 pt-3">
                            <p>
                              Cartões:{' '}
                              <strong>
                                {previewTicketCount.toLocaleString(
                                  'pt-BR',
                                )}
                              </strong>
                            </p>

                            <p>
                              Valor por cartão:{' '}
                              <strong>
                                {betPrice
                                  ? PricingService.formatCurrency(
                                      betPrice.price,
                                    )
                                  : 'não disponível'}
                              </strong>
                            </p>

                            <p>
                              Custo total:{' '}
                              <strong>
                                {previewTotalCost !== null
                                  ? PricingService.formatCurrency(
                                      previewTotalCost,
                                    )
                                  : 'não disponível'}
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>

                      {coveringLoading ||
                      coveringFetching ? (
                        <div className="flex items-center gap-3 rounded-lg border p-4">
                          <LoaderCircle className="size-5 animate-spin" />
                          Consultando catálogo...
                        </div>
                      ) : coveringError ? (
                        <div className="rounded-lg border border-destructive/40 p-4">
                          <p className="text-sm font-medium text-destructive">
                            Erro ao consultar o catálogo
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {coveringErrorDetails instanceof Error
                              ? coveringErrorDetails.message
                              : 'Ocorreu um erro inesperado.'}
                          </p>
                        </div>
                      ) : coveringDesign ? (
                        <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-6 text-emerald-600" />

                            <div>
                              <p className="font-semibold">
                                Matriz validada encontrada
                              </p>

                              <p className="text-sm text-muted-foreground">
                                {coveringDesign.ticketCount.toLocaleString(
                                  'pt-BR',
                                )}{' '}
                                cartões
                              </p>
                            </div>
                          </div>

                          <p className="text-sm">
                            Situação:{' '}
                            <strong>{optimalityLabel}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                          <div className="flex items-start gap-3">
                            <Database className="mt-0.5 size-5 text-amber-600" />

                            <div>
                              <p className="font-semibold">
                                Fechamento ainda não disponível
                              </p>

                              <p className="mt-1 text-sm text-muted-foreground">
                                Não existe uma matriz cadastrada para
                                C({selectedNumbers.length},{' '}
                                {ticketSize}, {guaranteeSize}).
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={
                              requestingDesign ||
                              requestRegistered ||
                              selectedNumbers.length < ticketSize
                            }
                            onClick={() =>
                              void handleRequestDesign()
                            }
                          >
                            {requestingDesign ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : requestRegistered ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Send className="size-4" />
                            )}

                            {requestingDesign
                              ? 'Registrando solicitação...'
                              : requestRegistered
                                ? 'Solicitação registrada'
                                : `Solicitar C(${selectedNumbers.length},${ticketSize},${guaranteeSize})`}
                          </Button>
                        </div>
                      )}

                      <Button
                        type="button"
                        className="w-full"
                        disabled={
                          !coveringDesign ||
                          coveringLoading ||
                          coveringFetching
                        }
                        onClick={handleApplyDesign}
                      >
                        <ShieldCheck className="size-4" />
                        {generateButtonLabel}
                      </Button>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={generatedTickets.length === 0}
                          onClick={() =>
                            handleExportClosureTickets('excel')
                          }
                        >
                          <Download className="size-4" />
                          Excel
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={generatedTickets.length === 0}
                          onClick={() =>
                            handleExportClosureTickets('pdf')
                          }
                        >
                          <Download className="size-4" />
                          PDF
                        </Button>
                      </div>

                      <div className="rounded-xl border border-input bg-background p-4">
                        <p className="text-sm font-semibold">
                          Salvar na biblioteca
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Selecione a biblioteca para salvar este fechamento.
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
                              {personalLibraries.map((library) => (
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

                      <div className="grid gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          disabled={
                            generatedTickets.length === 0 ||
                            saveClosure.isPending
                          }
                          onClick={() =>
                            setSaveModalOpen(true)
                          }
                        >
                          Salvar jogo
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={coveringFetching}
                          onClick={() =>
                            void refetchCovering()
                          }
                        >
                          <RefreshCw
                            className={`size-4 ${
                              coveringFetching
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                          Consultar novamente
                        </Button>
                      </div>

                      {message && (
                        <p className="rounded-lg bg-muted p-3 text-sm">
                          {message}
                        </p>
                      )}

                      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Salvar fechamento</DialogTitle>
                            <DialogDescription>
                              Informe um nome e, opcionalmente, uma
                              descrição para gravar este jogo.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="save-name">
                                Nome do jogo
                              </Label>

                              <Input
                                id="save-name"
                                value={saveName}
                                onChange={(event) =>
                                  setSaveName(event.target.value)
                                }
                                placeholder="Ex.: Fechamento 12/15"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="save-description">
                                Descrição
                              </Label>

                              <Input
                                id="save-description"
                                value={saveDescription}
                                onChange={(event) =>
                                  setSaveDescription(
                                    event.target.value,
                                  )
                                }
                                placeholder="Opcional"
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
                                <Label htmlFor="contestTo">
                                  Concurso final
                                </Label>

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

                            {saveError && (
                              <p className="text-sm text-destructive">
                                {saveError}
                              </p>
                            )}
                          </div>

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSaveModalOpen(false)}
                              disabled={saveClosure.isPending}
                            >
                              Cancelar
                            </Button>

                            <Button
                              type="button"
                              onClick={() =>
                                void handleSaveClosure()
                              }
                              disabled={saveClosure.isPending}
                            >
                              {saveClosure.isPending
                                ? 'Salvando...'
                                : 'Salvar'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      2. Escolha suas dezenas
                    </CardTitle>

                    <CardDescription>
                      {selectedNumbers.length} dezenas selecionadas.
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
                        onClick={sortNumbers}
                      >
                        Ordem crescente
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={reverseNumbers}
                      >
                        Inverter ordem
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {availableNumbers.map((number) => {
                        const index =
                          selectedNumbers.indexOf(number)
                        const selected = index >= 0

                        return (
                          <button
                            key={number}
                            type="button"
                            onClick={() =>
                              toggleNumber(number)
                            }
                            className={`relative flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition ${
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-background hover:bg-muted'
                            }`}
                          >
                            {String(number).padStart(2, '0')}

                            {selected && (
                              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">
                                {index + 1}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Ordem das dezenas
                      </h3>

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
                                disabled={index === 0}
                                onClick={() =>
                                  moveNumber(index, -1)
                                }
                              >
                                <ArrowUp className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={
                                  index ===
                                  selectedNumbers.length - 1
                                }
                                onClick={() =>
                                  moveNumber(index, 1)
                                }
                              >
                                <ArrowDown className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeNumber(number)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>3. Cartões</CardTitle>

                  <CardDescription>
                    Resultado da matriz aplicada às dezenas
                    selecionadas.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {generatedTickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center">
                      <ShieldCheck className="mx-auto size-10 text-muted-foreground" />

                      <p className="mt-4 text-sm text-muted-foreground">
                        Escolha uma configuração disponível e clique
                        em gerar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {generatedTickets.map((ticket, index) => (
                        <article
                          key={`${index}-${ticket.join('-')}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                        >
                          <Badge variant="secondary">
                            Cartão {index + 1}
                          </Badge>

                          {ticket.map((number) => (
                            <span
                              key={number}
                              className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                            >
                              {String(number).padStart(2, '0')}
                            </span>
                          ))}
                        </article>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
      </section>
    </AppLayout>
  )
}
