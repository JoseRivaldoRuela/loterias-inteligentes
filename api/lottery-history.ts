type ApiRequest = { method?: string; body?: Record<string, unknown> | string }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void }

const gameCodes: Record<string, string> = {
  'mega-sena': 'megasena', megasena: 'megasena', lotofacil: 'lotofacil', quina: 'quina',
}

function timestamp(value: string) {
  const [day, month, year] = value.split('/').map(Number)
  return Date.UTC(year, month - 1, day)
}

export const maxDuration = 60

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' })
  try {
    const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body ?? {}
    const code = gameCodes[String(payload.code ?? '').toLowerCase()]
    const start = Date.parse(`${payload.startDate}T00:00:00Z`)
    const end = Date.parse(`${payload.endDate}T23:59:59Z`)
    if (!code) return response.status(400).json({ error: 'Loteria não suportada.' })
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return response.status(400).json({ error: 'Período inválido.' })
    if (end - start > 1000 * 60 * 60 * 24 * 366 * 3) return response.status(400).json({ error: 'O período máximo é de 3 anos.' })

    const source = await fetch(`https://raw.githubusercontent.com/maickon/free-apiloterias/refs/heads/master/database/${code}/_todos.json`)
    if (!source.ok) throw new Error('A fonte histórica está temporariamente indisponível.')
    const history = await source.json()
    const results = history
      .filter((item: Record<string, unknown>) => {
        const date = timestamp(String(item.dataApuracao))
        return date >= start && date <= end
      })
      .map((item: Record<string, unknown>) => ({
        contestNumber: Number(item.numero), drawDate: String(item.dataApuracao),
        numbers: ((item.listaDezenas as string[]) ?? []).map(Number), lotteryName: String(item.tipoJogo ?? 'Loteria'),
        drawLocation: item.nomeMunicipioUFSorteio ?? item.localSorteio ?? null,
        accumulated: Boolean(item.acumulado),
      }))
      .sort((a: { contestNumber: number }, b: { contestNumber: number }) => b.contestNumber - a.contestNumber)
    return response.status(200).json({ results })
  } catch (error) {
    return response.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar histórico.' })
  }
}
