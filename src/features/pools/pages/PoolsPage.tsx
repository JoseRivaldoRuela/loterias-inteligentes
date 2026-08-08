import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Plus, Trash2, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TicketsCostSummary } from '@/features/pricing/components/TicketsCostSummary'
import { PricingService } from '@/features/pricing/services/PricingService'
import { useSavedGameSets } from '@/features/saved-games/hooks/useSavedGameSets'
import { useSavedGameTickets } from '@/features/saved-games/hooks/useSavedGameTickets'
import { BettingPoolRepository, type BettingPool } from '@/infrastructure/repositories/BettingPoolRepository'
import { useBettingPools } from '../hooks/useBettingPools'

const labels: Record<string, string> = { draft: 'Rascunho', active: 'Ativo', closed: 'Fechado', completed: 'Concluído', canceled: 'Cancelado' }
type ParticipantForm = { name: string; email: string; phone: string; shareCount: string }

export function PoolsPage() {
  const [params, setParams] = useSearchParams()
  const initialGame = params.get('jogo') ?? ''
  const [createOpen, setCreateOpen] = useState(Boolean(initialGame))
  const [selectedPool, setSelectedPool] = useState<BettingPool | null>(null)
  const [gameId, setGameId] = useState(initialGame)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'active'>('active')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [totalShares, setTotalShares] = useState('1')
  const [participants, setParticipants] = useState<ParticipantForm[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [creatorParticipates, setCreatorParticipates] = useState(false)
  const [error, setError] = useState('')
  const client = useQueryClient()
  const { data: pools = [], isLoading } = useBettingPools()
  const { data: games = [] } = useSavedGameSets()
  const game = games.find((item) => item.id === gameId)
  const { data: gameTickets = [] } = useSavedGameTickets(gameId)
  const invitations = useQuery({ queryKey: ['pool-invitations', selectedPool?.id], queryFn: () => BettingPoolRepository.listInvitations(selectedPool!.id), enabled: Boolean(selectedPool) })
  const poolParticipants = useQuery({ queryKey: ['pool-participants', selectedPool?.id], queryFn: () => BettingPoolRepository.listParticipants(selectedPool!.id), enabled: Boolean(selectedPool) })
  const create = useMutation({ mutationFn: BettingPoolRepository.createWithGame, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['betting-pools'] }); await client.invalidateQueries({ queryKey: ['saved-game-sets'] }) } })
  const changeStatus = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => BettingPoolRepository.updateStatus(id, value), onSuccess: async () => client.invalidateQueries({ queryKey: ['betting-pools'] }) })
  const invite = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => BettingPoolRepository.invite(id, email),
    onSuccess: async () => {
      setInviteEmail('')
      toast.success('Convite enviado por e-mail.')
      await client.invalidateQueries({ queryKey: ['pool-invitations', selectedPool?.id] })
    },
    onError: (caught) => toast.error(caught instanceof Error ? caught.message : 'Não foi possível enviar o convite.'),
  })

  async function submit() {
    setError('')
    if (!game || !name.trim()) return setError('Selecione um jogo e informe o nome do bolão.')
    const shares = Number(totalShares)
    if (!Number.isInteger(shares) || shares < 1) return setError('Informe uma quantidade válida de cotas do bolão.')
    if (participants.some((item) => item.name.trim().length < 2 || Number(item.shareCount) < 1)) return setError('Preencha o nome e a quantidade de cotas de todos os participantes.')
    if (participants.some((item) => item.email.trim() && !item.email.includes('@'))) return setError('Corrija os e-mails informados ou deixe-os em branco.')
    const allocated = participants.reduce((sum, item) => sum + Number(item.shareCount), creatorParticipates ? 1 : 0)
    if (allocated > shares) return setError(`Foram distribuídas ${allocated} cotas, mas o bolão possui somente ${shares}.`)
    const contestFrom = first ? Number(first) : null
    const contestTo = last ? Number(last) : null
    if (contestFrom && contestTo && contestTo < contestFrom) return setError('O concurso final não pode ser menor que o inicial.')
    try {
      if (gameTickets.length === 0) return setError('O jogo selecionado não possui cartões para calcular o bolão.')
      const contestCount = contestFrom && contestTo ? contestTo - contestFrom + 1 : 1
      const totalAmount = (await PricingService.calculateTicketsTotal(game.lotteryId, gameTickets.map((ticket) => ticket.numbers))) * contestCount
      await create.mutateAsync({ lotteryId: game.lotteryId, gameSetId: game.id, name, description, status, firstContestNumber: contestFrom, lastContestNumber: contestTo, totalShares: shares, totalAmount, participants: participants.map((item) => ({ ...item, shareCount: Number(item.shareCount) })), creatorParticipates })
      setCreateOpen(false); setParams({}); setName(''); setDescription(''); setParticipants([])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível criar o bolão.') }
  }

  return <AppLayout><section className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Bolões</h1><p className="text-sm text-muted-foreground">Gerencie jogos, participantes, situação e concursos válidos.</p></div><Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Novo bolão</Button></div>
    {isLoading ? <p>Carregando bolões...</p> : pools.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum bolão criado. Escolha um jogo da Biblioteca para começar.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{pools.map((pool) => <Card key={pool.id}><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle>{pool.name}</CardTitle><CardDescription>{pool.firstContestNumber ? `Concursos ${pool.firstContestNumber}${pool.lastContestNumber ? ` a ${pool.lastContestNumber}` : ''}` : 'Concursos ainda não definidos'}</CardDescription>{pool.totalAmount != null && <p className="mt-2 text-sm font-semibold">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pool.totalAmount)}{pool.sharePrice != null ? ` • Cota: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pool.sharePrice)}` : ''}</p>}</div><Badge variant={pool.status === 'active' ? 'default' : 'secondary'}>{labels[pool.status] ?? pool.status}</Badge></div></CardHeader><CardContent className="flex gap-2"><Button variant="outline" onClick={() => setSelectedPool(pool)}><Users className="size-4" /> Gerenciar</Button><Button render={<Link to={`/conferencia/boloes?pool=${pool.id}`} />}><CheckCircle2 className="size-4" /> Conferir</Button></CardContent></Card>)}</div>}

    <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); setError(''); if (!open) setParams({}) }}><DialogContent className="flex max-h-[90vh] flex-col overflow-hidden"><DialogHeader><DialogTitle>Criar bolão a partir de um jogo</DialogTitle></DialogHeader><div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 pr-1">
      <div className="space-y-2"><Label>Jogo</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={gameId} onChange={(e) => setGameId(e.target.value)}><option value="">Selecione</option>{games.filter((item) => !item.bettingPoolId).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.ticketCount} cartões)</option>)}</select><p className="text-xs text-muted-foreground">O jogo original continuará na sua biblioteca e poderá ser usado em outros bolões.</p></div>
      <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bolão da firma" /></div><div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Primeiro concurso</Label><Input type="number" min="1" value={first} onChange={(e) => setFirst(e.target.value)} /></div><div className="space-y-2"><Label>Último concurso</Label><Input type="number" min="1" value={last} onChange={(e) => setLast(e.target.value)} /></div></div>
      <div className="space-y-2"><Label>Situação</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}><option value="draft">Rascunho</option><option value="active">Ativo</option></select></div>
      <div className="space-y-2"><Label>Quantidade total de cotas</Label><Input type="number" min="1" value={totalShares} onChange={(e) => setTotalShares(e.target.value)} /></div>
      {game && gameTickets.length > 0 && <TicketsCostSummary compact lotteryId={game.lotteryId} tickets={gameTickets.map((ticket) => ticket.numbers)} totalShares={Number(totalShares)} multiplier={first && last && Number(last) >= Number(first) ? Number(last) - Number(first) + 1 : 1} />}
      <div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Participantes</Label><p className="text-xs text-muted-foreground">Nome e cotas são obrigatórios. E-mail e telefone são opcionais.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setParticipants((current) => [...current, { name: '', email: '', phone: '', shareCount: '1' }])}><Plus className="size-4" /> Participante</Button></div>{participants.map((participant, index) => <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"><div className="space-y-1"><Label>Nome *</Label><Input value={participant.name} onChange={(e) => setParticipants((current) => current.map((item, position) => position === index ? { ...item, name: e.target.value } : item))} /></div><div className="space-y-1"><Label>E-mail (opcional)</Label><Input type="email" value={participant.email} onChange={(e) => setParticipants((current) => current.map((item, position) => position === index ? { ...item, email: e.target.value } : item))} /></div><div className="space-y-1"><Label>Telefone (opcional)</Label><Input value={participant.phone} onChange={(e) => setParticipants((current) => current.map((item, position) => position === index ? { ...item, phone: e.target.value } : item))} /></div><div className="flex items-end gap-2"><div className="flex-1 space-y-1"><Label>Cotas *</Label><Input type="number" min="1" value={participant.shareCount} onChange={(e) => setParticipants((current) => current.map((item, position) => position === index ? { ...item, shareCount: e.target.value } : item))} /></div><Button type="button" size="icon" variant="outline" aria-label="Remover participante" onClick={() => setParticipants((current) => current.filter((_, position) => position !== index))}><Trash2 className="size-4" /></Button></div></div>)}</div>{error && <p className="text-sm text-destructive">{error}</p>}
      <label className="flex items-start gap-3 rounded-md border p-3"><input className="mt-1" type="checkbox" checked={creatorParticipates} onChange={(e) => setCreatorParticipates(e.target.checked)} /><span><span className="block text-sm font-medium">Também vou participar deste bolão</span><span className="block text-xs text-muted-foreground">Usaremos os dados da sua conta e será atribuída 1 cota. Desmarcado, você apenas administra.</span></span></label>
    </div><DialogFooter className="shrink-0 border-t bg-background pt-4"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={() => void submit()} disabled={create.isPending}>{create.isPending ? 'Criando...' : 'Criar bolão'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selectedPool)} onOpenChange={(open) => { if (!open) setSelectedPool(null) }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedPool?.name}</DialogTitle></DialogHeader>{selectedPool && <div className="space-y-5 py-2"><div className="space-y-2"><Label>Situação</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedPool.status} onChange={(e) => { void changeStatus.mutateAsync({ id: selectedPool.id, value: e.target.value }); setSelectedPool({ ...selectedPool, status: e.target.value }) }}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label>Participantes e cotas</Label><div className="mt-2 space-y-2">{poolParticipants.data?.map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium">{item.name}</span><Badge>{item.shareCount} {item.shareCount === 1 ? 'cota' : 'cotas'}</Badge></div>{(item.email || item.phone) && <p className="mt-1 text-xs text-muted-foreground">{[item.email, item.phone].filter(Boolean).join(' • ')}</p>}</div>)}{poolParticipants.isLoading && <p className="text-sm text-muted-foreground">Carregando participantes...</p>}{!poolParticipants.isLoading && !poolParticipants.data?.length && <p className="text-sm text-muted-foreground">Nenhum participante cadastrado.</p>}</div></div><div><Label>Convites de acesso</Label><div className="mt-2 space-y-2">{invitations.data?.map((item) => <div key={item.id} className="flex justify-between rounded-md border p-2 text-sm"><span>{item.invitedEmail}</span><Badge variant="secondary">{item.status === 'pending' ? 'Convidado' : item.status}</Badge></div>)}{!invitations.isLoading && !invitations.data?.length && <p className="text-sm text-muted-foreground">Nenhum convite enviado.</p>}</div><div className="mt-3 flex gap-2"><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" /><Button onClick={() => void invite.mutateAsync({ id: selectedPool.id, email: inviteEmail })} disabled={!inviteEmail || invite.isPending}>Convidar</Button></div></div><Button className="w-full" render={<Link to={`/conferencia/boloes?pool=${selectedPool.id}`} />}>Abrir conferência</Button></div>}</DialogContent></Dialog>
  </section></AppLayout>
}
