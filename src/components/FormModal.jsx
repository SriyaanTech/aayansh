import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Modal, Field, SearchSelect } from './ui'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { fullName } from '../utils/format'

// Config-driven form. Field types:
// text | email | tel | number | date | datetime-local | textarea | select | checkbox | crew | vessel | client | vacancy | course | file | section
export default function FormModal({ open, title, fields, initial, onClose, onSubmit, validate, submitLabel = 'Save', width = 820, onChange }) {
  const [values, setValues] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const needsRefs = fields.some((f) => ['crew', 'vessel', 'client', 'vacancy', 'course'].includes(f.type))
  const refs = useData(...(needsRefs ? ['crew', 'vessels', 'clients', 'vacancies', 'courses'] : []))

  useEffect(() => {
    if (open) {
      const base = {}
      fields.forEach((f) => { if (f.name && f.default !== undefined) base[f.name] = typeof f.default === 'function' ? f.default() : f.default })
      setValues({ ...base, ...(initial || {}) })
      setError('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const refOptions = useMemo(() => ({
    crew: (refs.crew || []).map((c) => ({ value: c.id, label: `${fullName(c)}`, sub: `${c.id} · ${c.rank} · ${c.status}` })),
    vessel: (refs.vessels || []).map((v) => ({ value: v.id, label: v.name, sub: `IMO ${v.imo} · ${v.type}` })),
    client: (refs.clients || []).map((c) => ({ value: c.id, label: c.name, sub: c.country })),
    vacancy: (refs.vacancies || []).map((v) => ({ value: v.id, label: v.title, sub: `${v.id} · ${v.status}` })),
    course: (refs.courses || []).map((c) => ({ value: c.id, label: c.name, sub: c.code })),
  }), [refs.crew, refs.vessels, refs.clients, refs.vacancies, refs.courses])

  const set = (name, value) => {
    setValues((s) => {
      let next = { ...s, [name]: value }
      const f = fields.find((x) => x.name === name)
      if (f?.effect) next = { ...next, ...f.effect(next, refs) }
      if (onChange) next = { ...next, ...(onChange(next, name, refs) || {}) }
      return next
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    for (const f of fields) {
      if (f.required && (f.showIf ? f.showIf(values) : true) && (values[f.name] === undefined || values[f.name] === '')) {
        setError(`${f.label} is required`); return
      }
    }
    const msg = validate?.(values, refs)
    if (msg) { setError(msg); return }
    setSaving(true)
    try {
      const out = { ...values }
      fields.forEach((f) => { if (f.type === 'number' && out[f.name] !== '' && out[f.name] !== undefined) out[f.name] = Number(out[f.name]) })
      await onSubmit(out)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const renderInput = (f) => {
    const v = values[f.name] ?? ''
    const common = { className: 'input', value: v, required: f.required, disabled: f.disabled, onChange: (e) => set(f.name, e.target.value), placeholder: f.placeholder }
    switch (f.type) {
      case 'textarea': return <textarea {...common} rows={f.rows || 3} />
      case 'select': {
        const opts = typeof f.options === 'function' ? f.options(values, refs) : f.options
        return (
          <select {...common}>
            <option value="">Select…</option>
            {opts.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        )
      }
      case 'checkbox': return (
        <span className="check"><input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} disabled={f.disabled} /> {f.checkLabel || 'Yes'}</span>
      )
      case 'crew': case 'vessel': case 'client': case 'vacancy': case 'course': {
        let opts = refOptions[f.type]
        if (f.filter) opts = opts.filter((o) => f.filter(o, values, refs))
        return <SearchSelect value={v} onChange={(val) => set(f.name, val)} options={opts} required={f.required} placeholder={`Search ${f.label.toLowerCase()}…`} />
      }
      case 'file': return (
        <label className="file-drop">
          <Upload size={16} />
          <span>{v || 'Choose file…'}</span>
          <input type="file" hidden onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return
            const r = await api.upload(file)
            set(f.name, r.fileName)
            if (f.urlField) set(f.urlField, r.url)
          }} />
        </label>
      )
      default: return <input {...common} type={f.type || 'text'} step={f.step} min={f.min} max={f.max} />
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose} width={width}
      footer={<>
        {error && <span className="form-error">{error}</span>}
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="cms-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </>}>
      <form id="cms-form" className="form-grid" onSubmit={submit}>
        {fields.map((f, i) => {
          if (f.showIf && !f.showIf(values)) return null
          if (f.type === 'section') return <h4 key={`s${i}`} className="form-section">{f.label}</h4>
          return <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.hint} span={f.span}>{renderInput(f)}</Field>
        })}
      </form>
    </Modal>
  )
}
