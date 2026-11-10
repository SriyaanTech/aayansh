// Export helpers: CSV, Excel (.xlsx) and PDF. Heavy libs are loaded on demand.

function cellValue(col, row) {
  if (col.exportValue) return col.exportValue(row)
  const v = row[col.key]
  return v === undefined || v === null ? '' : v
}

function toMatrix(columns, rows) {
  const cols = columns.filter((c) => c.key !== '_actions' && c.export !== false)
  return { headers: cols.map((c) => c.label), body: rows.map((r) => cols.map((c) => cellValue(c, r))) }
}

function download(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)
const safe = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')

export function exportCSV(title, columns, rows) {
  const { headers, body } = toMatrix(columns, rows)
  const esc = (v) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...body].map((r) => r.map(esc).join(',')).join('\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${safe(title)}_${stamp()}.csv`)
}

export async function exportExcel(title, columns, rows) {
  const XLSX = await import('xlsx')
  const { headers, body } = toMatrix(columns, rows)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body])
  ws['!cols'] = headers.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...body.map((r) => String(r[i] ?? '').length)) + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${safe(title)}_${stamp()}.xlsx`)
}

async function pdfLib() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { jsPDF, autoTable }
}

function header(doc, title, subtitle) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(11, 37, 69)
  doc.rect(0, 0, w, 54, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('CrewDesk', 40, 25)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Integrated Crew Management System', 40, 40)
  doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(title, w - 40, 25, { align: 'right' })
  if (subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(subtitle, w - 40, 40, { align: 'right' }) }
  doc.setTextColor(20, 20, 20)
}

export async function exportPDF(title, columns, rows) {
  const { jsPDF, autoTable } = await pdfLib()
  const { headers, body } = toMatrix(columns, rows)
  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  header(doc, title, `Generated ${new Date().toLocaleString('en-GB')} · ${rows.length} records`)
  autoTable(doc, {
    head: [headers], body, startY: 70, styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [28, 77, 122] }, alternateRowStyles: { fillColor: [244, 247, 251] },
  })
  doc.save(`${safe(title)}_${stamp()}.pdf`)
}

// Generic letter-style PDF: sections of [label, value] pairs plus free paragraphs.
// Used for offer letters, contracts, payslips and joining instructions.
export async function documentPDF({ title, subtitle, filename, blocks }) {
  const { jsPDF, autoTable } = await pdfLib()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  header(doc, title, subtitle)
  let y = 80
  const w = doc.internal.pageSize.getWidth()
  for (const b of blocks) {
    if (b.heading) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
      doc.text(b.heading, 40, y); y += 8
    }
    if (b.pairs) {
      autoTable(doc, {
        startY: y, body: b.pairs.map(([k, v]) => [k, String(v ?? '—')]), theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 170, fillColor: [244, 247, 251] } },
        margin: { left: 40, right: 40 },
      })
      y = doc.lastAutoTable.finalY + 20
    }
    if (b.table) {
      autoTable(doc, { startY: y, head: [b.table.head], body: b.table.body, styles: { fontSize: 9 }, headStyles: { fillColor: [28, 77, 122] }, margin: { left: 40, right: 40 } })
      y = doc.lastAutoTable.finalY + 20
    }
    if (b.text) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      const lines = doc.splitTextToSize(b.text, w - 80)
      doc.text(lines, 40, y + 6); y += lines.length * 13 + 16
    }
    if (b.signatures) {
      y += 30
      b.signatures.forEach((s, i) => {
        const x = 40 + i * ((w - 80) / b.signatures.length)
        doc.line(x, y, x + 160, y)
        doc.setFontSize(9); doc.text(s, x, y + 14)
      })
      y += 40
    }
    if (y > 760) { doc.addPage(); y = 50 }
  }
  doc.save(filename)
}
