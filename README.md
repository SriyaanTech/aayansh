# CrewDesk – Crew Management System (Frontend)

React 19 + Vite frontend for the Integrated Crew Management System (Merchant Navy).
Built against the project scope document: all 14 functional modules, the crew self-service
portal, role-based access, reports with Excel/PDF/CSV export, and audit trail.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Requires Node 20+.

## Demo mode (no backend yet)

With `VITE_API_URL` empty, the app runs on realistic sample data (≈150 seafarers, 8 vessels,
vacancies, contracts, payroll…) stored in your browser's localStorage. Everything you create or
edit persists until you click **Settings → Reset demo data**.

**Login:** pick any demo account chip on the login screen; any password with 4+ characters works.
Accounts marked 🔐 (Super Admin, HR, Crewing) ask for an MFA code — enter any 6 digits.
Switch to **Crew Portal** on the login screen to sign in as a seafarer.

## Connecting the backend

1. Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:8000/api`
2. Implement the endpoints in **API_CONTRACT.md**. All data access goes through
   `src/api/client.js`, so no page code needs to change.

## Project structure

```
src/
  api/
    client.js        ← single data layer: mock store OR REST (switch via VITE_API_URL)
    mockStore.js     ← localStorage DB + audit logging (demo only)
    mockData.js      ← seed generator (demo only)
    hooks.js         ← useData('crew','vessels'…), useConfig('settings')
  config/
    constants.js     ← ranks, departments, document types, statuses
    permissions.js   ← modules, actions, default role → permission matrix
    crewFields.js    ← crew form + duplicate detection
    training.js      ← mandatory-course rules
  context/           ← Auth (RBAC, MFA, session timeout), Lookups (crew/vessel maps)
  components/        ← DataTable, FormModal, ResourcePage (generic CRUD), Layout, UI kit
  pages/             ← one file per module
  pages/portal/      ← crew self-service portal
  utils/             ← formatting, Excel/PDF/CSV export, PDF letters (offer, contract, payslip, joining)
```

## Module map

| Scope section | Route | Highlights |
|---|---|---|
| Dashboard & MIS | `/` | 10 KPI tiles, vessel strength, pipeline, monthly stats, expiry summary |
| 3.1 Crew Database | `/crew`, `/crew/:id` | advanced filters, duplicate detection, profile with 11 tabs, comments & activity |
| 3.2 Recruitment | `/recruitment` | vacancies, drag-and-drop pipeline, interviews, internal/client approval, offer letter PDF, onboarding |
| 3.3 Documents | `/documents` | upload, preview, verify/reject with remarks, version history, 90/60/30-day alerts |
| 3.4 Vessels | `/vessels/:id` | vessel master, rank-wise safe-manning editor, vessel documents, crew history |
| 3.5 Crew Planning | `/planning` | assignments with overlap conflict check, rotation calendar (Gantt), availability search, relief planning |
| 3.6 Contracts | `/contracts` | salary auto-fill from rank structure, amendments with version history, approval, e-sign, renew, PDF |
| 3.7 Medical | `/medical` | Fit / Temporarily Unfit / Unfit, restrictions, renewal alerts |
| 3.8 Travel | `/travel` | flights, visa, hotel, pickup, expenses, approval, joining instructions PDF |
| 3.9 Sign-On/Off | `/sign-on-off` | auto-updates assignment, contract, crew availability & sea-service history |
| 3.10 Appraisal | `/appraisals` | scored evaluation, auto overall rating, rehire & training recommendation |
| 3.11 Payroll | `/payroll` | run payroll from contracts, OT, advances, deductions, allotment, multi-currency, payslip PDF, settlements |
| 3.12 Training | `/training` | records, course master, competency matrix, gap report with reminders |
| 3.13 Communication | `/communication` | compose Email/SMS/WhatsApp, templates, history, crew requests, alert rules |
| 3.14 Reports | `/reports` | all 13 reports from the scope, each exportable to Excel/PDF/CSV |
| 5 Users & Roles | `/users` | users, MFA, record scope, editable role × module × action matrix |
| 8 Security | `/audit`, `/settings` | audit trail, session timeout, password policy, MFA enforcement, retention |
| 4 Crew Portal | `/portal/*` | profile, documents upload, vacancies & application tracking, contracts, travel, payslips, training, requests |
