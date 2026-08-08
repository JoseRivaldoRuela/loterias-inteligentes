import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '')
    .replace(/_+/g, '_')
}

function formatTicketNumber(number: number) {
  return String(number).padStart(2, '0')
}

function buildTicketRows(tickets: number[][]) {
  const maxLength = Math.max(...tickets.map((ticket) => ticket.length), 0)

  return tickets.map((ticket, index) => {
    const row: Record<string, string> = {
      Cartao: `Cartão ${index + 1}`,
    }

    for (let columnIndex = 0; columnIndex < maxLength; columnIndex += 1) {
      row[`D${columnIndex + 1}`] =
        ticket[columnIndex] !== undefined
          ? formatTicketNumber(ticket[columnIndex])
          : ''
    }

    return row
  })
}

function buildHeaders(tickets: number[][]) {
  const maxLength = Math.max(...tickets.map((ticket) => ticket.length), 0)

  return ['Cartão', ...Array.from({ length: maxLength }, (_, index) => `D${index + 1}`)]
}

export function exportTicketsAsExcel(
  fileName: string,
  title: string,
  description: string | null,
  tickets: number[][],
) {
  const rows = buildTicketRows(tickets)
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: buildHeaders(tickets),
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jogos')

  if (title) {
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 })
    worksheet[titleCell] = { t: 's', v: `Título: ${title}` }
  }

  if (description) {
    const descCell = XLSX.utils.encode_cell({ r: 1, c: 0 })
    worksheet[descCell] = { t: 's', v: `Descrição: ${description}` }
  }

  const sanitized = sanitizeFileName(fileName)
  XLSX.writeFile(workbook, `${sanitized}.xlsx`)
}

export function exportTicketsAsPdf(
  fileName: string,
  title: string,
  description: string | null,
  tickets: number[][],
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const leftMargin = 40
  const contentWidth = pageWidth - leftMargin * 2

  doc.setFontSize(16)
  doc.text(title, leftMargin, 40, { maxWidth: contentWidth })

  if (description) {
    doc.setFontSize(11)
    doc.text(description, leftMargin, 60, { maxWidth: contentWidth })
  }

  const head = [buildHeaders(tickets)]
  const body = tickets.map((ticket, index) => [
    `Cartão ${index + 1}`,
    ...ticket.map(formatTicketNumber),
  ])

  autoTable(doc, {
    startY: description ? 80 : 70,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 76, 129],
      textColor: 255,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
    },
    styles: {
      cellPadding: 6,
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 60 },
    },
    margin: { left: leftMargin, right: leftMargin },
  })

  const sanitized = sanitizeFileName(fileName)
  doc.save(`${sanitized}.pdf`)
}

type PoolPdfParticipant = { name: string; email: string | null; phone: string | null; shareCount: number }
type PoolPdfGame = { name: string; tickets: number[][] }

export function exportPoolAsPdf(input: {
  fileName: string
  poolName: string
  contests: string
  totalAmount: string
  sharePrice: string
  totalShares: number
  participants: PoolPdfParticipant[]
  games: PoolPdfGame[]
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  doc.setFontSize(18)
  doc.text(input.poolName, margin, 42)
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`${input.contests} | Total: ${input.totalAmount} | ${input.totalShares} cotas | Cota: ${input.sharePrice}`, margin, 60, { maxWidth: pageWidth - margin * 2 })

  doc.setTextColor(0)
  doc.setFontSize(13)
  doc.text(`Participantes (${input.participants.length})`, margin, 88)
  autoTable(doc, {
    startY: 98,
    head: [['#', 'Nome', 'Contato', 'Cotas']],
    body: input.participants.map((participant, index) => [String(index + 1), participant.name, [participant.email, participant.phone].filter(Boolean).join(' / ') || '-', String(participant.shareCount)]),
    theme: 'grid',
    headStyles: { fillColor: [15, 76, 129], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 28 }, 3: { cellWidth: 45, halign: 'center' } },
    margin: { left: margin, right: margin },
  })

  let currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 98) + 26
  doc.setFontSize(13)
  doc.text(`Jogos (${input.games.reduce((sum, game) => sum + game.tickets.length, 0)} cartões)`, margin, currentY)
  currentY += 10

  input.games.forEach((game) => {
    autoTable(doc, {
      startY: currentY,
      head: [[game.name, 'Dezenas']],
      body: game.tickets.map((ticket, index) => [`Cartão ${index + 1} (${ticket.length})`, ticket.map(formatTicketNumber).join(' - ')]),
      theme: 'grid',
      headStyles: { fillColor: [31, 120, 82], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 105 } },
      margin: { left: margin, right: margin },
    })
    currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY) + 16
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text(`Loterias Inteligentes - Página ${page} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' })
  }
  doc.save(`${sanitizeFileName(input.fileName)}.pdf`)
}
