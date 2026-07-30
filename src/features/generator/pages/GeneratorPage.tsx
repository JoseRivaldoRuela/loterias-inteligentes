import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  RefreshCw,
  Sparkles,
  Trash2,
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

export function GeneratorPage() {
  const {
    data: lotteries = [],
    isLoading,
    isError,
    error: lotteriesError,
  } = useLotteries()

  const [selectedLotteryId, setSelectedLotteryId] = useState('')
  const [ticketCount, setTicketCount] = useState(50)
  const [numbersPerTicket, setNumbersPerTicket] = useState(15)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [tickets, setTickets] = useState<GeneratedTicket[]>([])
  const [message, setMessage] = useState('')

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
    setSelectedNumbers(availableNumbers)
    setTickets([])
    setMessage('')
  }, [selectedLottery?.id, availableNumbers])

  function clearGeneratedTickets() {
    setTickets([])
    setMessage('')
  }

  function handleLotteryChange(lotteryId: string) {
    setSelectedLotteryId(lotteryId)
    clearGeneratedTickets()
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

  async function handleCopyTickets() {
    if (tickets.length === 0) {
      return
    }

    const content = tickets
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
            Escolha as dezenas, defina a sequência e acompanhe o custo
            estimado.
          </p>
        </div>

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
            <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
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
            </div>

            <Card>
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

                  <Button
                    type="button"
                    variant="outline"
                    disabled={tickets.length === 0}
                    onClick={() => void handleCopyTickets()}
                  >
                    <Copy className="size-4" />
                    Copiar
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-10 text-center">
                    <Sparkles className="mx-auto size-10 text-muted-foreground" />

                    <p className="mt-4 text-sm text-muted-foreground">
                      Selecione as dezenas, organize a sequência e
                      clique em Gerar cartões.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket, index) => (
                      <article
                        key={`${index}-${ticket.numbers.join('-')}`}
                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                      >
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
            </Card>
          </>
        )}
      </section>
    </AppLayout>
  )
}