import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, X, Eye } from 'lucide-react'
import ResourcePage from '../components/ResourcePage'
import FormModal from '../components/FormModal'
import { Badge, Modal, KV, useToast, Stat } from '../components/ui'
import { CrewCell, useLookups } from '../context/LookupContext'
import { DOCUMENT_TYPES, DOC_STATUS } from '../config/constants'
import { expiryStatus, fmtDate, daysUntil, fullName } from '../utils/format'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useData } from '../api/hooks'
import { FileWarning, FileCheck2, FileClock, FileX2 } from 'lucide-react'

export const DOC_FIELDS = [
  { name: 'crewId', label: 'Seafarer', type: 'crew', required: true, span: 2 },
  { name: 'type', label: 'Document category', type: 'select', options: DOCUMENT_TYPES, required: true },
  { name: 'number', label: 'Document number', required: true },
  { name: 'issueDate', label: 'Issue date', type: 'date' },
  { name: 'expiryDate', label: 'Expiry date', type: 'date' },
  { name: 'issuingAuthority', label: 'Issuing authority', span: 2 },
  { name: 'status', label: 'Verification status', type: 'select', options: DOC_STATUS, default: 'Pending' },
  { name: 'fileName', label: 'Upload document', type: 'file', urlField: 'fileUrl', span: 2 },
  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 3 },
]

export function useDocColumns({ showCrew = true } = {}) {
  const { crewName } = useLookups()
  return [
    ...(showCrew ? [{ key: 'crewId', label: 'Seafarer', render: (r) => <CrewCell id={r.crewId} />, exportValue: (r) => `${r.crewId} ${crewName(r.crewId)}` }] : []),
    { key: 'type', label: 'Document' },
    { key: 'number', label: 'Number' },
    { key: 'issueDate', label: 'Issued', render: (r) => fmtDate(r.issueDate) },
    { key: 'expiryDate', label: 'Expiry', render: (r) => fmtDate(r.expiryDate) },
    { key: 'expiryBucket', label: 'Expiry alert', sortValue: (r) => daysUntil(r.expiryDate) ?? 99999, exportValue: (r) => expiryStatus(r.expiryDate).label, render: (r) => { const e = expiryStatus(r.expiryDate); return <Badge tone={e.tone}>{e.days !== null && e.days >= 0 && e.days <= 90 ? `${e.days}d left` : e.label}</Badge> } },
    { key: 'issuingAuthority', label: 'Authority' },
    { key: 'status', label: 'Verification', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'version', label: 'Ver.', render: (r) => `v${r.version || 1}` },
  ]
}

export function DocActions({ row, onPreview }) {
  const { can } = useAuth()
  const toast = useToast()
  const [rejecting, setRejecting] = useState(false)
  return (
    <>
      <button className="icon-btn" title="Preview" onClick={() => onPreview(row)}><Eye size={15} /></button>
      {can('documents', 'approve') && row.status !== 'Verified' && (
        <button className="icon-btn" title="Verify" onClick={async () => { await api.update('documents', row.id, { status: 'Verified', remarks: '' }); toast('Document verified') }}><Check size={15} color="var(--ok)" /></button>
      )}
      {can('documents', 'approve') && row.status !== 'Rejected' && (
        <button className="icon-btn" title="Reject" onClick={() => setRejecting(true)}><X size={15} color="var(--danger)" /></button>
      )}
      <FormModal open={rejecting} title={`Reject ${row.type}`} width={480} submitLabel="Reject document"
        fields={[{ name: 'remarks', label: 'Rejection remarks', type: 'textarea', required: true, span: 3 }]}
        onClose={() => setRejecting(false)}
        onSubmit={async (v) => { await api.update('documents', row.id, { status: 'Rejected', remarks: v.remarks }); toast('Document rejected', 'danger') }} />
    </>
  )
}

export function DocPreview({ doc, onClose }) {
  const { crewById } = useLookups()
  const { audit } = useData('audit')
  if (!doc) return null
  const history = (audit || []).filter((a) => a.resource === 'documents' && a.recordId === doc.id)
  return (
    <Modal open title={`${doc.type} · ${doc.number}`} onClose={onClose} width={680}>
      <div className="stack">
        <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 10, height: 200, display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
          {doc.fileUrl && /\.(png|jpe?g|webp|gif)$/i.test(doc.fileName) ? <img src={doc.fileUrl} alt="" style={{ maxHeight: 190, maxWidth: '100%' }} />
            : doc.fileUrl ? <a className="btn" href={doc.fileUrl} target="_blank" rel="noreferrer">Open {doc.fileName}</a>
            : <span className="muted">{doc.fileName || 'No file uploaded'} · preview available once storage is connected</span>}
        </div>
        <KV items={[
          ['Seafarer', `${fullName(crewById[doc.crewId])} (${doc.crewId})`], ['Category', doc.type], ['Number', doc.number],
          ['Issue date', fmtDate(doc.issueDate)], ['Expiry date', fmtDate(doc.expiryDate)], ['Issuing authority', doc.issuingAuthority],
          ['Verification', <Badge key="s">{doc.status}</Badge>], ['Version', `v${doc.version || 1}`], ['Remarks', doc.remarks],
        ]} />
        <div>
          <h4 style={{ marginBottom: 8 }}>Version & activity history</h4>
          {history.length ? (
            <ul className="timeline">{history.map((h) => <li key={h.id}><strong>{h.action}</strong> by {h.user} <small className="muted">{fmtDate(h.at)} {h.detail && `· ${h.detail}`}</small></li>)}</ul>
          ) : <p className="muted">v{doc.version || 1} uploaded. No changes recorded in this session.</p>}
        </div>
      </div>
    </Modal>
  )
}

export default function Documents() {
  const [params] = useSearchParams()
  const [preview, setPreview] = useState(null)
  const columns = useDocColumns()
  const { documents } = useData('documents')
  const exp = params.get('expiry')
  const n = (f) => documents.filter(f).length

  return (
    <>
      <ResourcePage
        resource="documents" module="documents" title="Certificate & Document Management"
        subtitle="Statutory and professional documents with verification workflow and 90/60/30-day expiry alerts."
        createLabel="Upload Document" formTitle="Upload document" exportTitle="Certificate Expiry"
        columns={columns} fields={DOC_FIELDS}
        initialFilters={exp ? { expiry: exp } : {}}
        filters={[
          { key: 'type', label: 'Type', options: DOCUMENT_TYPES },
          { key: 'status', label: 'Verification', options: DOC_STATUS },
          { key: 'expiry', label: 'Expiry', options: [{ value: 'expired', label: 'Expired' }, { value: '30', label: '≤ 30 days' }, { value: '60', label: '≤ 60 days' }, { value: '90', label: '≤ 90 days' }], test: (r, v) => { const d = daysUntil(r.expiryDate); if (d === null) return false; return v === 'expired' ? d < 0 : d <= Number(v) } },
        ]}
        beforeSave={(v, isEdit, prev) => (isEdit && prev.fileName !== v.fileName ? { ...v, version: (prev.version || 1) + 1, status: 'Pending' } : { ...v, version: v.version || 1 })}
        rowActions={(r) => <DocActions row={r} onPreview={setPreview} />}
      >
        <div className="stats">
          <Stat label="Pending verification" value={n((d) => d.status === 'Pending')} icon={FileClock} tone="amber" />
          <Stat label="Verified" value={n((d) => d.status === 'Verified')} icon={FileCheck2} tone="green" />
          <Stat label="Rejected" value={n((d) => d.status === 'Rejected')} icon={FileX2} tone="red" />
          <Stat label="Expiring ≤ 90 days" value={n((d) => { const x = daysUntil(d.expiryDate); return x !== null && x >= 0 && x <= 90 })} icon={FileWarning} tone="amber" />
          <Stat label="Expired" value={n((d) => daysUntil(d.expiryDate) < 0)} icon={FileWarning} tone="red" />
        </div>
      </ResourcePage>
      <DocPreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )
}
