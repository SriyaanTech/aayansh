import { useMemo, useState } from 'react'
import { Search, Download, ChevronDown, ChevronUp, FileSpreadsheet, FileText } from 'lucide-react'
import { exportCSV, exportExcel, exportPDF } from '../utils/export'
import { Empty } from './ui'
import { useAuth } from '../context/AuthContext'

export default function DataTable({
  columns, rows, loading, filters = [], exportTitle, module, pageSize = 15, onRowClick, toolbar, searchPlaceholder = 'Search…', initialFilters = {}, rowClass,
}) {
  const { can } = useAuth()
  const [q, setQ] = useState('')
  const [f, setF] = useState(initialFilters)
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)

  const filtered = useMemo(() => {
    let out = rows || []
    for (const flt of filters) {
      const v = f[flt.key]
      if (v === undefined || v === '') continue
      out = out.filter((r) => (flt.test ? flt.test(r, v) : String(flt.value ? flt.value(r) : r[flt.key]) === v))
    }
    if (q.trim()) {
      const needle = q.toLowerCase()
      out = out.filter((r) => columns.some((c) => {
        const val = c.searchValue ? c.searchValue(r) : c.exportValue ? c.exportValue(r) : r[c.key]
        return val !== undefined && val !== null && String(val).toLowerCase().includes(needle)
      }))
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      const get = col?.sortValue || col?.exportValue || ((r) => r[sort.key])
      out = [...out].sort((a, b) => {
        const x = get(a); const y = get(b)
        if (x === y) return 0
        if (x === undefined || x === null || x === '') return 1
        if (y === undefined || y === null || y === '') return -1
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * (sort.dir === 'asc' ? 1 : -1)
      })
    }
    return out
  }, [rows, q, f, sort, filters, columns])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages)
  const visible = filtered.slice((cur - 1) * pageSize, cur * pageSize)
  const canExport = exportTitle && (!module || can(module, 'export'))

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="search">
          <Search size={16} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder={searchPlaceholder} />
        </div>
        {filters.map((flt) => (
          <select key={flt.key} className="input input-sm" value={f[flt.key] ?? ''} onChange={(e) => { setF((s) => ({ ...s, [flt.key]: e.target.value })); setPage(1) }}>
            <option value="">{flt.label}: All</option>
            {flt.options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        ))}
        <div className="spacer" />
        {toolbar}
        {canExport && (
          <div className="dropdown">
            <button className="btn" onClick={() => setExportOpen((o) => !o)} onBlur={() => setTimeout(() => setExportOpen(false), 150)}>
              <Download size={16} /> Export
            </button>
            {exportOpen && (
              <div className="dropdown-menu">
                <button onClick={() => { setExportOpen(false); exportExcel(exportTitle, columns, filtered) }}><FileSpreadsheet size={15} /> Excel (.xlsx)</button>
                <button onClick={() => { setExportOpen(false); exportPDF(exportTitle, columns, filtered) }}><FileText size={15} /> PDF</button>
                <button onClick={() => { setExportOpen(false); exportCSV(exportTitle, columns, filtered) }}><FileText size={15} /> CSV</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }} className={c.align === 'right' ? 'right' : ''}>
                  {c.sortable === false || c.key === '_actions' ? c.label : (
                    <button className="th-sort" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length}><div className="skeleton-rows">{Array.from({ length: 6 }).map((_, i) => <span key={i} />)}</div></td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={columns.length}><Empty title="No records found">Try changing the search or filters.</Empty></td></tr>}
            {!loading && visible.map((r) => (
              <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`${onRowClick ? 'clickable' : ''} ${rowClass ? rowClass(r) : ''}`}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'right' : ''} onClick={c.key === '_actions' ? (e) => e.stopPropagation() : undefined}>
                    {c.render ? c.render(r) : (r[c.key] === '' || r[c.key] == null ? <span className="muted">—</span> : String(r[c.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span className="muted">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
        {pages > 1 && (
          <div className="pager">
            <button className="btn btn-sm" disabled={cur === 1} onClick={() => setPage(cur - 1)}>Prev</button>
            <span>Page {cur} of {pages}</span>
            <button className="btn btn-sm" disabled={cur === pages} onClick={() => setPage(cur + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
