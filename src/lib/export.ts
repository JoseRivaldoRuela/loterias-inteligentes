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
