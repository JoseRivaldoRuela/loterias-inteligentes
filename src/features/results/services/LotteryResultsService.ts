export type LotteryResult = {
  contestNumber: number
  drawDate: string
  numbers: number[]
  lotteryName: string
  drawLocation: string | null
  accumulated: boolean
}

type CaixaResult = {
  numero?: number
  dataApuracao?: string
  listaDezenas?: string[]
  tipoJogo?: string
  localSorteio?: string
  nomeMunicipioUFSorteio?: string
  acumulado?: boolean
}

const CAIXA_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'

const caixaGameCodes: Record<string, string> = {
  'mega-sena': 'megasena', megasena: 'megasena', lotofacil: 'lotofacil',
  quina: 'quina', lotomania: 'lotomania', timemania: 'timemania',
  'dupla-sena': 'duplasena', duplasena: 'duplasena', federal: 'federal',
  'dia-de-sorte': 'diadesorte', diadesorte: 'diadesorte',
  'super-sete': 'supersete', supersete: 'supersete',
  '+milionaria': 'maismilionaria', maismilionaria: 'maismilionaria',
}

function endpointCode(code: string): string {
  const normalized = code.trim().toLowerCase()
  return caixaGameCodes[normalized] ?? normalized.replace(/[^a-z0-9]/g, '')
}

function parseBrazilianDate(value: string): number {
  const [day, month, year] = value.split('/').map(Number)
  return Date.UTC(year, month - 1, day)
}

function mapResult(data: CaixaResult): LotteryResult {
  if (!data.numero || !data.dataApuracao || !data.listaDezenas?.length) {
    throw new Error('A CAIXA retornou um resultado incompleto.')
  }
  return {
    contestNumber: data.numero,
    drawDate: data.dataApuracao,
    numbers: data.listaDezenas.map(Number),
    lotteryName: data.tipoJogo ?? 'Loteria',
    drawLocation: data.nomeMunicipioUFSorteio ?? data.localSorteio ?? null,
    accumulated: Boolean(data.acumulado),
  }
}

async function fetchResult(code: string, contestNumber?: number): Promise<LotteryResult> {
  const suffix = contestNumber ? `/${contestNumber}` : ''
  const response = await fetch(`${CAIXA_API}/${endpointCode(code)}${suffix}`, {
    headers: { Accept: 'application/json' },
  })
  if (response.status === 404) throw new Error('Concurso não encontrado.')
  if (!response.ok) throw new Error('Não foi possível consultar os resultados da CAIXA agora.')
  return mapResult((await response.json()) as CaixaResult)
}

export const LotteryResultsService = {
  findLatest(code: string): Promise<LotteryResult> {
    return fetchResult(code)
  },

  findByContest(code: string, contestNumber: number): Promise<LotteryResult> {
    if (!Number.isInteger(contestNumber) || contestNumber <= 0) {
      return Promise.reject(new Error('Informe um número de concurso válido.'))
    }
    return fetchResult(code, contestNumber)
  },

  async findByDate(code: string, inputDate: string): Promise<LotteryResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) throw new Error('Informe uma data válida.')
    const [year, month, day] = inputDate.split('-')
    const wantedDate = `${day}/${month}/${year}`
    const wantedTimestamp = parseBrazilianDate(wantedDate)
    const latest = await fetchResult(code)
    if (wantedTimestamp > parseBrazilianDate(latest.drawDate)) throw new Error('Ainda não há resultado para essa data.')

    let low = 1
    let high = latest.contestNumber
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      const result = middle === latest.contestNumber ? latest : await fetchResult(code, middle)
      const resultTimestamp = parseBrazilianDate(result.drawDate)
      if (result.drawDate === wantedDate) return result
      if (resultTimestamp < wantedTimestamp) low = middle + 1
      else high = middle - 1
    }
    throw new Error('Não houve sorteio dessa loteria na data informada.')
  },

  async findHistory(code: string, startDate: string, endDate: string): Promise<LotteryResult[]> {
    const start = Date.parse(`${startDate}T00:00:00Z`)
    const end = Date.parse(`${endDate}T23:59:59Z`)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      throw new Error('Informe um período válido para a análise.')
    }

    const localDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const apiBaseUrl = localDevelopment ? 'https://loterias-inteligentes.vercel.app' : ''
    const response = await fetch(`${apiBaseUrl}/api/lottery-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, startDate, endDate }),
    })
    const responseText = await response.text()
    let data: { error?: string; results?: LotteryResult[] }
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch {
      throw new Error('O serviço de histórico retornou uma resposta inválida. Reinicie o servidor local e tente novamente.')
    }
    if (!response.ok) throw new Error(data?.error ?? 'Não foi possível consultar o histórico.')
    if (data?.error) throw new Error(data.error)
    return (data?.results ?? []) as LotteryResult[]
  },
}
