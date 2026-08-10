import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Search } from 'lucide-react'

import { LotteryEngine } from '@/core/lottery/LotteryEngine'
import { AppLayout } from '@/components/layout/AppLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SavedGameService } from '@/features/closures/services/SavedGameService'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { useBettingPools } from '@/features/pools/hooks/useBettingPools'
import { LotteryResultsService } from '@/features/results/services/LotteryResultsService'
import { useSavedGameSets } from '@/features/saved-games/hooks/useSavedGameSets'

type ConferenceResult = {
  key: string
  contest: number
  drawDate: string
  setId: string
  setName: string
  played: boolean
  ticketCount: number
  summary: Record<number, number>
  error?: string
}

function parseContestList(value: string): number[] {
  return [...new Set(value.split(/[,;\s]+/).map(Number).filter((number) => Number.isInteger(number) && number > 0))]
}

function playedContests(parameters: Record<string, unknown>): number[] {
  const contests = parameters.playedContests
  return Array.isArray(contests) ? contests.map(Number).filter(Number.isInteger) : []
}

export function PoolConferencesPage() {
  const [searchParams] = useSearchParams()
  const { data: pools = [], isLoading: poolsLoading } = useBettingPools()
  const { data: allSets = [], isLoading: setsLoading, error: setsError } = useSavedGameSets()
  const { data: lotteries = [] } = useLotteries()
  const [poolId, setPoolId] = useState(() => searchParams.get('pool') ?? 'all')
  const [contestText, setContestText] = useState(() => searchParams.get('concurso') ?? '')
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([])
  const [results, setResults] = useState<ConferenceResult[]>([])
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const visibleSets = useMemo(
    () => poolId === 'all' ? allSets : allSets.filter((set) => set.bettingPoolId === poolId),
    [allSets, poolId],
  )

  useEffect(() => {
    if (contestText || poolId === 'all') return
    const pool = pools.find((item) => item.id === poolId)
    if (!pool?.firstContestNumber) return
    const contests: number[] = []
    const end = pool.lastContestNumber ?? pool.firstContestNumber
    for (let contest = pool.firstContestNumber; contest <= end; contest += 1) contests.push(contest)
    setContestText(contests.join(', '))
  }, [contestText, poolId, pools])

  useEffect(() => {
    setSelectedSetIds((current) => {
      const visibleIds = visibleSets.map((set) => set.id)
      const retained = current.filter((id) => visibleIds.includes(id))
      return retained.length > 0 ? retained : visibleIds
    })
  }, [visibleSets])

  function toggleSet(setId: string) {
    setSelectedSetIds((current) => current.includes(setId)
      ? current.filter((id) => id !== setId)
      : [...current, setId])
  }

  async function handleCheck() {
    const contests = parseContestList(contestText)
    const selectedSets = visibleSets.filter((set) => selectedSetIds.includes(set.id))
    if (contests.length === 0) { setError('Informe pelo menos um concurso.'); return }
    if (selectedSets.length === 0) { setError('Selecione pelo menos um jogo salvo.'); return }

    setChecking(true); setError(''); setResults([])
    const resultCache = new Map<string, Awaited<ReturnType<typeof LotteryResultsService.findByContest>>>()
    const conferenceResults: ConferenceResult[] = []

    for (const contest of contests) {
      for (const gameSet of selectedSets) {
        const lottery = lotteries.find((item) => item.id === gameSet.lotteryId)
        const base = { key: `${contest}-${gameSet.id}`, contest, setId: gameSet.id, setName: gameSet.name, played: playedContests(gameSet.generationParameters).includes(contest), ticketCount: gameSet.ticketCount, summary: {} }
        if (!lottery) { conferenceResults.push({ ...base, drawDate: '', error: 'Loteria do jogo não encontrada.' }); continue }

        try {
          const cacheKey = `${lottery.code}-${contest}`
          let officialResult = resultCache.get(cacheKey)
          if (!officialResult) {
            officialResult = await LotteryResultsService.findByContest(lottery.code, contest)
            resultCache.set(cacheKey, officialResult)
          }
          const tickets = await SavedGameService.getSavedGameTickets(gameSet.id)
          const summary: Record<number, number> = {}
          for (const ticket of tickets) {
            const hits = LotteryEngine.countHits(ticket.numbers, officialResult.numbers)
            summary[hits] = (summary[hits] ?? 0) + 1
          }
          conferenceResults.push({ ...base, drawDate: officialResult.drawDate, summary })
        } catch (caught) {
          conferenceResults.push({ ...base, drawDate: '', error: caught instanceof Error ? caught.message : 'Falha na conferência.' })
        }
      }
    }

    setResults(conferenceResults)
    setChecking(false)
  }

  return <AppLayout><section className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Conferência de jogos</h1><p className="text-sm text-muted-foreground">Confira um ou vários concursos e veja se cada jogo foi realmente apostado.</p></div><Button variant="outline" render={<Link to="/resultados" />}><Search className="size-4" /> Consultar resultado</Button></div>

    <Card><CardHeader><CardTitle>O que deseja conferir?</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="pool-filter">Origem dos jogos</Label><select id="pool-filter" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={poolId} onChange={(event) => { setPoolId(event.target.value); setResults([]) }} disabled={poolsLoading}><option value="all">Todos os jogos salvos e bibliotecas</option>{pools.map((pool) => <option key={pool.id} value={pool.id}>Bolão: {pool.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="conference-contests">Concurso(s)</Label><Input id="conference-contests" value={contestText} onChange={(event) => setContestText(event.target.value)} placeholder="Ex.: 3240, 3242, 3246, 3247" /><p className="text-xs text-muted-foreground">Separe vários concursos por vírgula.</p></div></div>

      <div className="space-y-2"><div className="flex items-center justify-between"><Label>Jogos que serão conferidos</Label>{visibleSets.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedSetIds(selectedSetIds.length === visibleSets.length ? [] : visibleSets.map((set) => set.id))}>{selectedSetIds.length === visibleSets.length ? 'Desmarcar todos' : 'Selecionar todos'}</Button>}</div>
        {setsLoading ? <p className="rounded-md border p-3 text-sm text-muted-foreground">Carregando jogos...</p> : setsError ? <p className="rounded-md border p-3 text-sm text-destructive">Não foi possível carregar os jogos salvos.</p> : visibleSets.length === 0 ? <p className="rounded-md border p-3 text-sm text-muted-foreground">Nenhum jogo encontrado nesta origem. Jogos só aparecem no bolão quando forem vinculados a ele; use “Todos” para ver também bibliotecas e jogos salvos.</p> : <div className="grid gap-2 sm:grid-cols-2">{visibleSets.map((set) => { const contests = playedContests(set.generationParameters); return <label key={set.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3"><input type="checkbox" className="mt-1" checked={selectedSetIds.includes(set.id)} onChange={() => toggleSet(set.id)} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{set.name}</span><span className="text-xs text-muted-foreground">{set.ticketCount} cartões • {contests.length > 0 ? `jogado em ${contests.join(', ')}` : 'nenhum concurso marcado como jogado'}</span></span></label> })}</div>}
      </div>
      <Button onClick={() => void handleCheck()} disabled={checking || selectedSetIds.length === 0}>{checking ? 'Conferindo...' : 'Conferir concursos'}</Button>
    </CardContent></Card>

    {error && <Alert variant="destructive"><AlertTitle>Não foi possível conferir</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

    {results.length > 0 && <div className="space-y-4">{[...new Set(results.map((item) => item.contest))].map((contest) => <Card key={contest}><CardHeader><CardTitle>Concurso {contest}</CardTitle></CardHeader><CardContent className="space-y-3">{results.filter((item) => item.contest === contest).map((item) => <div key={item.key} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{item.setName}</strong>{item.drawDate && <p className="text-xs text-muted-foreground">Sorteio de {item.drawDate} • {item.ticketCount} cartões</p>}</div><Badge variant={item.played ? 'default' : 'secondary'}>{item.played ? <><CheckCircle2 className="size-3" /> Jogado</> : 'Não jogado'}</Badge></div>{item.error ? <p className="mt-3 text-sm text-destructive">{item.error}</p> : <div className="mt-3 flex flex-wrap gap-2">{Object.keys(item.summary).sort((a, b) => Number(b) - Number(a)).map((hits) => <Badge key={hits} variant="outline">{hits} acertos: {item.summary[Number(hits)]} cartão(ões)</Badge>)}</div>}</div>)}</CardContent></Card>)}</div>}
  </section></AppLayout>
}
