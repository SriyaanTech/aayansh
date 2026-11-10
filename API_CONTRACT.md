# Backend API contract

The frontend talks to one generic REST shape. Base URL = `VITE_API_URL` (e.g. `http://localhost:8000/api`).
All requests send `Authorization: Bearer <token>` after login. A `401` logs the user out.

## Generic CRUD (every resource below)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/{resource}` | – | `[...]` (or `{ data: [...] }`) |
| GET | `/{resource}/{id}` | – | record |
| POST | `/{resource}` | record (no id) | created record **with `id`** |
| PATCH | `/{resource}/{id}` | partial record | updated record |
| DELETE | `/{resource}/{id}` | – | 204 |

IDs are strings. The demo uses prefixed IDs (`CRW-0001`, `VSL-0001`…), but any unique string works.
Dates are `YYYY-MM-DD`; date-times are `YYYY-MM-DDTHH:mm`. Field names are camelCase.
The backend should write an `audit` row for every create/update/delete.

## Config & auth

| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/config/permissions` | `{ [role]: { [moduleKey]: ['view','create','edit','delete','approve','export'] } }` |
| GET/PUT | `/config/settings` | see `defaultSettings()` in `src/api/mockStore.js` |
| POST | `/auth/login` | `{ email, password, portal: 'staff'|'crew' }` → `{ token, user }` or `{ mfaRequired: true, email }` |
| POST | `/auth/mfa` | `{ email, code }` → `{ token, user }` |
| POST | `/uploads` | multipart `file` → `{ fileName, url }` |

`user` = `{ id, name, email, role }`; crew users also carry `crewId`.

## Resources and fields

The best reference is the seed generator `src/api/mockData.js` — every record shape is there.
Summary (all records also have `id`):

| Resource | Key fields |
|---|---|
| `crew` | employeeId, firstName, lastName, dob, gender, nationality, phone, email, address, passportNo, passportExpiry, cdcNo, cdcExpiry, indosNo, emergencyName/Relation/Phone, department, rank, totalExperienceMonths, rankExperienceMonths, previousEmployer, vesselTypeExperience, lastSignOn, lastSignOff, availableFrom, expectedSalary, preferredVesselType, preferredTradingArea, status, photo, createdAt |
| `seaService` | crewId, vesselName, vesselType, rank, company, grt, signOn, signOff |
| `comments` | crewId, author, date, text |
| `vessels` | name, imo, type, flag, owner, manager, clientId, grt, dwt, built, tradingArea, status, `manning: [{rank, required}]`, `documents: [{name, expiry, fileName}]` |
| `clients` | name, country, contact, email |
| `documents` | crewId, type, number, issueDate, expiryDate, issuingAuthority, status (Pending/Verified/Rejected), remarks, version, fileName, fileUrl |
| `vacancies` | title, clientId, vesselId, rank, department, numberRequired, minExperienceMonths, mandatoryCertificates, salary, currency, contractMonths, joiningDate, joiningPort, deadline, status, description, postedOn |
| `applications` | vacancyId, crewId, appliedOn, stage, source, screeningResult, interviewDate, interviewer, assessmentScore, internalApproval, clientApproval, offerSent, status, remarks |
| `assignments` | crewId, vesselId, rank, signOnDate, plannedSignOff, actualSignOff, joiningPort, relievingId, status (Planned/Onboard/Completed/Cancelled), approval |
| `contracts` | crewId, vesselId, rank, startDate, endDate, durationMonths, basicWage, fixedOT, leavePay, otherAllowance, currency, cba, terms, status, approval, signed, signedAt, version, `history: [{version, at, note}]`, renewedFrom |
| `medicals` | crewId, examDate, expiryDate, centre, doctor, status (Fit/Temporarily Unfit/Unfit), restrictions, remarks, fileName |
| `travel` | crewId, vesselId, purpose, fromCity, toCity, departure, arrival, airline, flightNo, pnr, visaStatus, hotel, pickup, agent, expenses, currency, status, joiningConfirmed, instructions, ticketFile |
| `signOns` | crewId, vesselId, rank, joiningDate, port, joiningConfirmed, masterConfirmed, contractCommenced, documentsReceived |
| `signOffs` | crewId, vesselId, rank, signOffDate, port, reason, masterAppraisal, settlementStatus, nextEligibility, remarks |
| `appraisals` | crewId, vesselId, rank, periodFrom, periodTo, evaluator, technical, safety, behaviour, teamwork (1–5), overall, rehire, trainingRecommendation, comments |
| `payroll` | crewId, vesselId, period (YYYY-MM), basic, fixedOT, extraOT, leaveWages, allowances, advance, deductions, gross, net, allotment, currency, status, bank |
| `salaryStructures` | rank, basic, fixedOT, leavePay, otherAllowance, otRate, currency |
| `courses` | code, name, mandatoryFor, validityMonths, durationDays, institute |
| `trainingRecords` | crewId, courseId, institute, completedOn, expiryDate, certificateNo, status, fileName |
| `notifications` | type, title, body, channel (Email/SMS/WhatsApp), audience (Crew/Internal), crewId?, date, read, status |
| `requests` | crewId, subject, message, date, status, response |
| `users` | name, email, role, status, mfa, scope, lastLogin |
| `audit` | at, user, action, resource, recordId, detail (read-only) |

## Side-effects currently done in the frontend

To keep the demo coherent, some pages chain updates (e.g. sign-off → complete assignment → complete contract
→ add sea-service row → set crew On Leave). When the backend is ready you can move these into
transactional endpoints; search for `afterSave` in `src/pages/` to find them:

- `SignOnOff.jsx` – sign-on / sign-off cascades
- `Planning.jsx` – `syncCrewStatus()` after assignment changes
- `Recruitment.jsx` – `onboard()` creates assignment + draft contract
- `Payroll.jsx` – "Generate" creates payroll rows from active contracts

Scheduled jobs the backend should own: document/medical/contract/training expiry alerts
(thresholds in `settings.expiryAlertDays`), interview reminders, and the actual Email/SMS/WhatsApp
delivery for `notifications` records.
