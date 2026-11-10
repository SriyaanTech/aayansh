import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import DataTable from './DataTable'
import FormModal from './FormModal'
import { PageHeader, useConfirm, useToast } from './ui'
import { useData } from '../api/hooks'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Generic list + create/edit/delete screen driven by column & field config.
export default function ResourcePage({
  resource, module, title, subtitle, columns, fields, filters, exportTitle, rowActions, transform,
  beforeSave, afterSave, createLabel = 'Add New', headerActions, initialFilters, onRowClick, hideHeader, defaults, formTitle, validate, embedded, formWidth, children, canCreate = true, formOnChange, rowClass, readOnly,
}) {
  const data = useData(resource)
  const rows = transform ? transform(data[resource] || []) : data[resource] || []
  const { can } = useAuth()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [editing, setEditing] = useState(null) // null | {} (new) | record

  const save = async (values) => {
    const isEdit = !!editing?.id
    const payload = beforeSave ? await beforeSave(values, isEdit, editing) : values
    const saved = isEdit ? await api.update(resource, editing.id, payload) : await api.create(resource, payload)
    await afterSave?.(saved, isEdit, editing)
    toast(isEdit ? 'Record updated' : 'Record created')
  }

  const remove = async (row) => {
    if (await confirm(`Delete ${row.id}? This cannot be undone.`, { danger: true, confirmLabel: 'Delete' })) {
      await api.remove(resource, row.id)
      toast('Record deleted')
    }
  }

  const actionsCol = {
    key: '_actions', label: '', width: 1, sortable: false, export: false,
    render: (r) => (
      <div className="row-actions">
        {rowActions?.(r, { edit: () => setEditing(r) })}
        {fields && can(module, 'edit') && <button className="icon-btn" title="Edit" onClick={() => setEditing(r)}><Pencil size={15} /></button>}
        {!readOnly && can(module, 'delete') && <button className="icon-btn danger" title="Delete" onClick={() => remove(r)}><Trash2 size={15} /></button>}
      </div>
    ),
  }

  return (
    <>
      {!hideHeader && (
        <PageHeader title={title} subtitle={subtitle} actions={<>
          {headerActions}
          {fields && canCreate && can(module, 'create') && <button className="btn btn-primary" onClick={() => setEditing({ ...(defaults || {}) })}><Plus size={16} /> {createLabel}</button>}
        </>} />
      )}
      {children}
      <div className={embedded ? '' : 'card'}>
        <DataTable
          columns={[...columns, actionsCol]}
          rows={rows}
          loading={data.loading}
          filters={filters}
          exportTitle={exportTitle || title}
          module={module}
          initialFilters={initialFilters}
          onRowClick={onRowClick}
          rowClass={rowClass}
          toolbar={hideHeader && fields && canCreate && can(module, 'create') ? <button className="btn btn-primary" onClick={() => setEditing({ ...(defaults || {}) })}><Plus size={16} /> {createLabel}</button> : null}
        />
      </div>
      {fields && (
        <FormModal
          open={!!editing}
          title={editing?.id ? `Edit ${editing.id}` : formTitle || `New ${title.replace(/s$/, '')}`}
          fields={fields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={save}
          validate={validate}
          width={formWidth}
          onChange={formOnChange}
        />
      )}
      {confirmNode}
    </>
  )
}
