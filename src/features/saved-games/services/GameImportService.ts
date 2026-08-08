import * as XLSX from 'xlsx'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

function validTicket(values: unknown[], minimum: number, maximum: number, numberLimit: number): number[] | null {
  const numbers = values
    .map((value) => typeof value === 'number' ? value : Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= numberLimit)
  const unique = [...new Set(numbers)]
  return unique.length >= minimum && unique.length <= maximum && unique.length === numbers.length
    ? unique.sort((a, b) => a - b)
    : null
}

function normalizeTickets(rows: unknown[][], minimum: number, maximum: number, numberLimit: number): number[][] {
  const tickets = rows
    .map((row) => validTicket(row, minimum, maximum, numberLimit))
    .filter((ticket): ticket is number[] => ticket !== null)
  if (tickets.length === 0) throw new Error('Nenhum cartão válido foi encontrado no arquivo.')
  const ticketSize = tickets[0].length
  const sameSize = tickets.filter((ticket) => ticket.length === ticketSize)
  if (sameSize.length !== tickets.length) throw new Error('O arquivo possui cartões com quantidades diferentes de dezenas.')
  return sameSize
}

async function readSpreadsheet(file: File, minimum: number, maximum: number, numberLimit: number): Promise<number[][]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) throw new Error('A planilha não possui páginas para importar.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: true })
  return normalizeTickets(rows.map((row) => row.slice(1)), minimum, maximum, numberLimit)
}

async function readPdf(file: File, minimum: number, maximum: number, numberLimit: number): Promise<number[][]> {
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const rows: unknown[][] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines = new Map<number, { x: number; text: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !('transform' in item)) continue
      const y = Math.round(item.transform[5])
      const line = lines.get(y) ?? []
      line.push({ x: item.transform[4], text: item.str })
      lines.set(y, line)
    }
    for (const line of lines.values()) {
      const ordered = line.sort((a, b) => a.x - b.x).map((item) => item.text)
      const joined = ordered.join(' ')
      if (!/cart(?:ã|a|Ã£)o\s*\d+/i.test(joined)) continue
      const withoutLabel = joined.replace(/cart(?:ã|a|Ã£)o\s*\d+/i, '')
      rows.push(withoutLabel.match(/\b\d{1,2}\b/g) ?? [])
    }
  }
  return normalizeTickets(rows, minimum, maximum, numberLimit)
}

export const GameImportService = {
  async read(file: File, minimum: number, maximum: number, numberLimit: number): Promise<number[][]> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'pdf') return readPdf(file, minimum, maximum, numberLimit)
    if (extension === 'xls' || extension === 'xlsx') return readSpreadsheet(file, minimum, maximum, numberLimit)
    throw new Error('Formato não aceito. Selecione um arquivo PDF, XLS ou XLSX.')
  },
}
