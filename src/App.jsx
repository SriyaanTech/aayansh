import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LookupProvider } from './context/LookupContext'
import { ToastProvider } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CrewList from './pages/CrewList'
import CrewProfile from './pages/CrewProfile'
import Recruitment from './pages/Recruitment'
import Vessels from './pages/Vessels'
import VesselDetail from './pages/VesselDetail'
import Planning from './pages/Planning'
import Documents from './pages/Documents'
import Contracts from './pages/Contracts'
import Medical from './pages/Medical'
import Travel from './pages/Travel'
import SignOnOff from './pages/SignOnOff'
import Appraisals from './pages/Appraisals'
import Payroll from './pages/Payroll'
import Training from './pages/Training'
import Communication from './pages/Communication'
import Reports from './pages/Reports'
import UsersRoles from './pages/UsersRoles'
import Audit from './pages/Audit'
import Settings from './pages/Settings'
import NoAccess from './pages/NoAccess'
import PortalLayout from './pages/portal/PortalLayout'
import PortalHome from './pages/portal/PortalHome'
import PortalProfile from './pages/portal/PortalProfile'
import PortalDocuments from './pages/portal/PortalDocuments'
import PortalVacancies from './pages/portal/PortalVacancies'
import PortalContracts from './pages/portal/PortalContracts'
import PortalTravel from './pages/portal/PortalTravel'
import PortalPayslips from './pages/portal/PortalPayslips'
import PortalTraining from './pages/portal/PortalTraining'
import PortalRequests from './pages/portal/PortalRequests'

function RequireStaff({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (user.role === 'Crew Member') return <Navigate to="/portal" replace />
  return children
}
function RequireCrew({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login?portal=crew" replace />
  if (user.role !== 'Crew Member') return <Navigate to="/" replace />
  return children
}
function Guard({ module, children }) {
  const { can } = useAuth()
  return can(module, 'view') ? children : <NoAccess />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LookupProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RequireStaff><Layout /></RequireStaff>}>
              <Route index element={<Guard module="dashboard"><Dashboard /></Guard>} />
              <Route path="crew" element={<Guard module="crew"><CrewList /></Guard>} />
              <Route path="crew/:id" element={<Guard module="crew"><CrewProfile /></Guard>} />
              <Route path="recruitment" element={<Guard module="recruitment"><Recruitment /></Guard>} />
              <Route path="vessels" element={<Guard module="vessels"><Vessels /></Guard>} />
              <Route path="vessels/:id" element={<Guard module="vessels"><VesselDetail /></Guard>} />
              <Route path="planning" element={<Guard module="planning"><Planning /></Guard>} />
              <Route path="documents" element={<Guard module="documents"><Documents /></Guard>} />
              <Route path="contracts" element={<Guard module="contracts"><Contracts /></Guard>} />
              <Route path="medical" element={<Guard module="medical"><Medical /></Guard>} />
              <Route path="travel" element={<Guard module="travel"><Travel /></Guard>} />
              <Route path="sign-on-off" element={<Guard module="signonoff"><SignOnOff /></Guard>} />
              <Route path="appraisals" element={<Guard module="appraisals"><Appraisals /></Guard>} />
              <Route path="payroll" element={<Guard module="payroll"><Payroll /></Guard>} />
              <Route path="training" element={<Guard module="training"><Training /></Guard>} />
              <Route path="communication" element={<Guard module="notifications"><Communication /></Guard>} />
              <Route path="reports" element={<Guard module="reports"><Reports /></Guard>} />
              <Route path="users" element={<Guard module="users"><UsersRoles /></Guard>} />
              <Route path="audit" element={<Guard module="audit"><Audit /></Guard>} />
              <Route path="settings" element={<Guard module="settings"><Settings /></Guard>} />
            </Route>

            <Route path="/portal" element={<RequireCrew><PortalLayout /></RequireCrew>}>
              <Route index element={<PortalHome />} />
              <Route path="profile" element={<PortalProfile />} />
              <Route path="documents" element={<PortalDocuments />} />
              <Route path="vacancies" element={<PortalVacancies />} />
              <Route path="contracts" element={<PortalContracts />} />
              <Route path="travel" element={<PortalTravel />} />
              <Route path="payslips" element={<PortalPayslips />} />
              <Route path="training" element={<PortalTraining />} />
              <Route path="requests" element={<PortalRequests />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LookupProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
