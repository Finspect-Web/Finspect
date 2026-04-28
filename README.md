# Finspect Practice Management Platform

Full-stack role-based practice management platform (Jamku-style) for **Finspect**.

## Tech stack

- **Frontend:** React (Vite), Tailwind CSS, Axios
- **Backend:** Node.js, Express
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + bcrypt
- **Notifications:** Nodemailer + Twilio (WhatsApp structure)
- **Scheduling:** node-cron

## Project structure

```text
Finspect/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ seed.js
│  ├─ src/
│  │  ├─ constants/
│  │  ├─ controllers/
│  │  ├─ cron/
│  │  ├─ middleware/
│  │  ├─ prisma/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ server.js
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ context/
│  │  ├─ hooks/
│  │  ├─ pages/
│  │  ├─ utils/
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  └─ .env.example
└─ README.md
```

## Backend setup

1. Copy environment template:
   - `backend/.env.example` → `backend/.env`
2. For DB-free local auth/testing, keep `USE_DUMMY_AUTH=true` and use:
   - `admin@finspect.com` / `Admin@123`
   - `staff@finspect.com` / `Staff@123`
3. For real DB mode, set `USE_DUMMY_AUTH=false` and configure PostgreSQL + secrets.
4. Run:
   - `cd backend`
   - `npm install`
   - `npm run prisma:migrate`
   - `npm run prisma:generate`
   - `npm run prisma:seed`
   - `npm run dev`

API base URL: `http://localhost:5000/api`

### Core APIs

- Auth: `POST /auth/login`, `POST /auth/register` (ADMIN)
- Users: `GET /users` (ADMIN)
- Clients: CRUD (`/clients`)
- Tasks: create/list/update/delete (`/tasks`)
- Credentials: create/list/update/delete (`/credentials`) (ADMIN)
- Invoices: create/list/view/update/delete (`/invoices`)
- Payments: add/list by invoice (`/invoices/:id/payments`)
- Dashboard: summary/activity/staff-monitoring (`/dashboard/*`)
- Task Stages: list/create/update/delete (`/task-stages`)
- Attendance: check-in/check-out/list/mark (`/attendance/*`)
- Timesheets: create/list/update/delete (`/timesheets`)
- Calendar: unified events feed (`/calendar/events`)
- Workflow Engine: compliance types, templates, steps, task generation (`/compliance-types`, `/workflows/*`, `/workflow-steps/*`, `/generate-tasks`)

## Frontend setup

1. Copy template:
   - `frontend/.env.example` → `frontend/.env`
2. Run:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Frontend URL: `http://localhost:5173`

## Implemented feature coverage

- Role-based auth (`ADMIN`, `STAFF`) with JWT
- Staff creation by admin
- Client management with detail page
- Task assignment, filtering, search, completion flow
- Employee monitoring and activity logs
- Billing, invoice lifecycle, and payment tracking
- Encrypted credential vault with mask/show/copy
- Dashboard metrics + pending notification badge
- Email + WhatsApp structured notifications on assignment
- Hourly cron reminders for tasks due in next 24 hours
- Task stage setup and stage movement from task board
- Attendance tracking with self check-in/check-out and admin marking
- Timesheet entry management with billable-hour summary
- Unified calendar feed for tasks, compliance, attendance, and timesheet events
- Dark mode toggle and modern sidebar/topbar SaaS UI
