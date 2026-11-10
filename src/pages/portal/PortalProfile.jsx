import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Card, KV, useToast } from '../../components/ui'
import FormModal from '../../components/FormModal'
import { api } from '../../api/client'
import { fmtDate, fullName, months } from '../../utils/format'
import { usePortal } from './usePortal'

export default function PortalProfile() {
  const { me } = usePortal()
  const [edit, setEdit] = useState(false)
  const toast = useToast()
  if (!me) return null
  return (
    <>
      <div className="page-head"><div><h1>My Profile</h1><p className="muted">Keep your contact details up to date. Professional details are maintained by the crewing team.</p></div>
        <button className="btn btn-primary" onClick={() => setEdit(true)}><Pencil size={15} /> Update contact details</button></div>
      <div className="grid g2">
        <Card title="Personal"><KV cols={2} items={[['Name', fullName(me)], ['Crew ID', me.id], ['Date of birth', fmtDate(me.dob)], ['Nationality', me.nationality], ['Phone', me.phone], ['Email', me.email], ['Address', me.address]]} /></Card>
        <Card title="Identity"><KV cols={2} items={[['Passport', me.passportNo], ['Passport expiry', fmtDate(me.passportExpiry)], ['CDC', me.cdcNo], ['CDC expiry', fmtDate(me.cdcExpiry)], ['INDOS', me.indosNo]]} /></Card>
        <Card title="Professional"><KV cols={2} items={[['Rank', me.rank], ['Department', me.department], ['Sea experience', months(me.totalExperienceMonths)], ['Rank experience', months(me.rankExperienceMonths)], ['Preferred vessel', me.preferredVesselType], ['Preferred trading', me.preferredTradingArea]]} /></Card>
        <Card title="Emergency contact"><KV cols={3} items={[['Name', me.emergencyName], ['Relation', me.emergencyRelation], ['Phone', me.emergencyPhone]]} /></Card>
      </div>
      <FormModal open={edit} title="Update contact details" initial={me} onClose={() => setEdit(false)} width={720}
        fields={[
          { name: 'phone', label: 'Contact number', type: 'tel', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'address', label: 'Address', span: 3 },
          { type: 'section', label: 'Emergency contact' }, { name: 'emergencyName', label: 'Name' }, { name: 'emergencyRelation', label: 'Relation' }, { name: 'emergencyPhone', label: 'Phone' },
          { type: 'section', label: 'Preferences' }, { name: 'availableFrom', label: 'Available from', type: 'date' }, { name: 'expectedSalary', label: 'Expected salary (USD)', type: 'number' }, { name: 'photo', label: 'Profile photo', type: 'file', urlField: 'photo' },
        ]}
        onSubmit={async (v) => { const { phone, email, address, emergencyName, emergencyRelation, emergencyPhone, availableFrom, expectedSalary, photo } = v; await api.update('crew', me.id, { phone, email, address, emergencyName, emergencyRelation, emergencyPhone, availableFrom, expectedSalary, photo }); toast('Profile updated') }} />
    </>
  )
}
