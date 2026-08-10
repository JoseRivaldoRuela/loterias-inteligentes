import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, CalendarDays, Hash, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLotteries } from '@/features/lotteries/hooks/useLotteries'
import { LotteryResultsService, type LotteryResult } from '@/features/results/services/LotteryResultsService'

export function ResultsPage() {
  const { data: lotteries = [], isLoading } = useLotteries()
  const [lotteryId, setLotteryId] = useState('')
  const [contestNumber, setContestNumber] = useState('')
  const [drawDate, setDrawDate] = useState('')
  const [result, setResult] = useState<LotteryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedLottery = lotteries.find((lottery) => lottery.id === lotteryId) ?? lotteries[0]

  async function search(mode: 'contest' | 'date') {
    if (!selectedLottery) return
    setLoading(true); setError(''); setResult(null)
    try {
      setResult(mode === 'contest'
        ? await LotteryResultsService.findByContest(selectedLottery.code, Number(contestNumber))
        : await LotteryResultsService.findByDate(selectedLottery.code, drawDate))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível realizar a consulta.')
    } finally { setLoading(false) }
  }

  async function navigateTo(target: 'previous' | 'latest' | 'next') {
    if (!selectedLottery || !result) return
    setLoading(true); setError('')
    try {
      const found = target === 'latest'
        ? await LotteryResultsService.findLatest(selectedLottery.code)
        : await LotteryResultsService.findByContest(
            selectedLottery.code,
            result.contestNumber + (target === 'next' ? 1 : -1),
          )
      setResult(found)
      setContestNumber(String(found.contestNumber))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o concurso.')
    } finally { setLoading(false) }
  }

  const conferenceUrl = result ? `/conferencia/boloes?concurso=${result.contestNumber}&dezenas=${result.numbers.join(',')}` : '/conferencia/boloes'

  return <AppLayout><section className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Consulta de resultados</h1><p className="mt-1 text-sm text-muted-foreground">Consulte as dezenas oficiais por concurso ou pela data do sorteio.</p></div>
    <Card><CardContent className="space-y-5 pt-6">
      <div className="space-y-2"><Label htmlFor="result-lottery">Loteria</Label><select id="result-lottery" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={selectedLottery?.id ?? ''} onChange={(e) => setLotteryId(e.target.value)} disabled={isLoading}>{lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}</select></div>
      <Tabs defaultValue="contest"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="contest"><Hash className="size-4" /> Por concurso</TabsTrigger><TabsTrigger value="date"><CalendarDays className="size-4" /> Por data</TabsTrigger></TabsList>
        <TabsContent value="contest" className="mt-4 space-y-3"><Label htmlFor="contest-number">Número do concurso</Label><div className="flex gap-2"><Input id="contest-number" type="number" min="1" value={contestNumber} onChange={(e) => setContestNumber(e.target.value)} placeholder="Ex.: 3450" /><Button onClick={() => void search('contest')} disabled={loading || !contestNumber || !selectedLottery}><Search className="size-4" /> {loading ? 'Consultando...' : 'Consultar'}</Button></div></TabsContent>
        <TabsContent value="date" className="mt-4 space-y-3"><Label htmlFor="draw-date">Data do sorteio</Label><div className="flex gap-2"><Input id="draw-date" type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} /><Button onClick={() => void search('date')} disabled={loading || !drawDate || !selectedLottery}><Search className="size-4" /> {loading ? 'Consultando...' : 'Consultar'}</Button></div></TabsContent>
      </Tabs>
    </CardContent></Card>
    {error && <Alert variant="destructive"><AlertTitle>Consulta não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {result && <Card><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>{result.lotteryName} — concurso {result.contestNumber}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Sorteio de {result.drawDate}{result.drawLocation ? ` • ${result.drawLocation}` : ''}</p></div><Badge variant={result.accumulated ? 'secondary' : 'default'}>{result.accumulated ? 'Acumulou' : 'Não acumulou'}</Badge></CardHeader><CardContent className="space-y-5"><div className="flex flex-wrap gap-2">{result.numbers.map((number, index) => <span key={`${number}-${index}`} className="flex size-11 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{String(number).padStart(2, '0')}</span>)}</div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => void navigateTo('previous')} disabled={loading || result.contestNumber <= 1}><ArrowLeft className="size-4" /> Anterior</Button><Button variant="outline" onClick={() => void navigateTo('latest')} disabled={loading}>Atual</Button><Button variant="outline" onClick={() => void navigateTo('next')} disabled={loading}>Próximo <ArrowRight className="size-4" /></Button></div><Button render={<Link to={conferenceUrl} />}>Usar na conferência <ArrowRight className="size-4" /></Button></CardContent></Card>}
  </section></AppLayout>
}
