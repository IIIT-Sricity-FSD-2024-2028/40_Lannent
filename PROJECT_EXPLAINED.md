# Lannent Project Explanation for Evaluation

This document explains what the project does, how the frontend works, how the backend works, how data is stored, and how the money and admin system works.

---

## 1) What this project is

This project is a freelance / gig-work platform where:

- Clients post jobs/tasks
- Workers bid or accept work
- Experts review technical quality or disputes
- Staff/admins monitor the system and money flow

The project is built around a marketplace model with:

- Task posting and milestone tracking
- Wallet and escrow payments
- Proposal submission by workers
- Technical audit / expert review
- Dispute handling
- Revenue analytics for admins

The system is a demo platform, not a full production app. Most data is kept in memory on the backend using seeded arrays, not a real database.

---

## 2) High-level architecture

The project has two major parts:

### Frontend
- Located in `front-end/`
- Static HTML pages + CSS + JavaScript
- Pages like login, dashboard, task posting, project workroom, admin screens, etc.
- The frontend is mostly page-driven; it does not use React or Angular.
- It talks to the backend using REST API calls through `front-end/js/store.js` and `front-end/js/auth.js`.

### Backend
- Located in `back-end/`
- NestJS + TypeScript
- Handles authentication, API routes, permission checks, business logic, and in-memory data storage
- Supplied with swagger docs and middleware-based security checks

---

## 3) Main tech stack

### Backend
- NestJS
- TypeScript
- Express under the hood
- JWT for authentication
- Swagger for API docs
- Validation pipes and guard-based role checks
- Middleware for logging, auth, request id, throttling, sanitization

### Frontend
- HTML pages
- CSS styling
- Plain JavaScript
- Fetch/XHR for API calls
- LocalStorage for token + session data

---

## 4) Project actors and their roles

### 4.1 Client
Purpose:
- Post tasks
- Fund projects
- Approve milestone payments
- Raise disputes if necessary

Responsibilities:
- Create job requirements
- Set budget and deadlines
- Hire a worker
- Fund escrow
- Review worker submissions
- Approve or reject milestone output

### 4.2 Worker / Gig worker
Purpose:
- Browse available tasks
- Submit proposals
- Complete milestone work
- Receive payment after approval

Responsibilities:
- Accept/open tasks
- Submit deliverables for milestones
- Communicate in workroom
- Track earnings and wallet status

### 4.3 Expert Reviewer
Purpose:
- Check technical quality of work
- Review audits
- Help resolve disputes
- Provide expert verdicts

Responsibilities:
- Accept technical audits
- Review milestone quality
- Give pass/fail verdicts
- Participate in dispute resolution if assigned

### 4.4 Staff / admin roles
The project separates admin duties into four roles instead of one general admin:

1. `superuser` = platform operations/admin user
2. `revenue-admin` = money and revenue configuration
3. `intake-admin` = expert applications and reviewer onboarding
4. `compliance-admin` = audit trail and oversight only

This split is intentional and is defined in `back-end/src/common/constants/roles.ts`.

---

## 5) How the backend is organized

The backend is split by module. Each module is a domain area.

### Major modules
- `auth` → login, JWT, user identity
- `users` → user creation, account lookup, profile data
- `tasks` → jobs/projects creation and lifecycle
- `milestones` → project milestone tracking and approval
- `proposals` → worker bids for tasks
- `ledger` → escrow, wallet balance, fee logic
- `transactions` → money movement records
- `revenue` → analytics and fee reports
- `expert-applications` → expert reviewer application intake
- `audit-requests` and `audit-reports` → technical quality review workflow
- `disputes` → conflict management
- `files` → upload/download of project file attachments
- `messages` and `notifications` → communication surfaces
- `seed` → initial demo data reset
- `audit` → compliance audit log

This is all wired in `back-end/src/app.module.ts`.

---

## 6) How backend startup and security work

### `main.ts`
This file starts the NestJS API and configures the server.

Important features:
- Global prefix `/api`
- Static serving of the frontend from the same server
- CORS configuration
- JSON body parser and URL-encoded parsing
- Helmet security headers
- Global validation pipe
- Global response interceptor
- Global exception filter
- Swagger docs at `/api-docs`

This means the frontend and API are served from the same origin, which is better than running them separately.

### Middleware chain
In `AppModule`, the order is:

1. RequestIdMiddleware
2. PayloadGuardMiddleware
3. SanitizeMiddleware
4. AuthMiddleware
5. LoggerMiddleware

This means every request gets:
- request id
- payload checks
- data sanitization
- auth verification
- request logging

---

## 7) Authentication and authorization flow

### 7.1 Login
In `UsersService.login()`:
- finds user by email
- verifies password
- rejects suspended accounts
- returns user + session info

In `AuthService.login()`:
- calls `UsersService.login()`
- creates JWT claims:
  - `sub` = user id
  - `role` = user role
  - `email` = user email
- signs the token and returns it to the client

### 7.2 JWT token
The token is saved in browser localStorage as `lannent_token`.

The frontend sends this token in the `Authorization: Bearer ...` header with every API request through `front-end/js/store.js`.

### 7.3 Auth middleware
`AuthMiddleware` runs on every request.

Its job:
- reads the Authorization header
- verifies the JWT using `AuthService.verify()`
- if valid: sets `req.user` with id, role, and email
- overrides `role` and `user-id` headers using token values so they cannot be spoofed
- rejects invalid bearer token with an unauthorized error

### 7.4 Role guard
`RoleGuard` checks `@Roles(...)` decorators on controllers.

If a route requires a role, it reads the user role from the validated token and compares it to the allowed roles.

If role does not match, the request is rejected.

---

## 8) Data storage pattern

The backend does not use a real database. It stores data in arrays inside repositories.

### Example: User storage
`UsersRepository` stores:
- base users in `this.users`
- client-specific data in `this.clients`
- worker-specific data in `this.workers`
- expert-specific data in `this.experts`

This is a classic table-split design:
- `USERS` contains common fields
- roles have separate sub-tables for extra data

### Seed data
The demo system uses `seed.data.ts`.

Example users:
- client@gmail.com
- worker@gmail.com
- expert@gmail.com
- super@gmail.com
- admin@gmail.com (revenue-admin)
- intake@gmail.com (intake-admin)
- compliance@gmail.com (compliance-admin)

The app can reset to seed state via a seed endpoint. This is intended for demo/testing.

---

## 9) How user creation works

### Public signup
Only client and worker are allowed to sign up from public forms.

This is controlled by `SELF_SERVICE_ROLES`.

### Privileged creation
Staff and expert approval flows use `createPrivileged()`.

This allows:
- admin-created users
- expert applications that become expert accounts after approval
- seed-created staff accounts

### User record shape
A merged user object contains the base user + role-specific fields.

Example role-specific fields:
- client: company, location
- worker: skills, rating, completedProjects
- expert: specialization, reviewsDone, domains
- staff/admin: mostly empty placeholders because they have no child table

---

## 10) Frontend behavior and how pages talk to backend

The frontend uses `front-end/js/store.js` as the central API layer.

### `store.js` does three main things
1. Finds the correct backend URL
2. Adds auth headers automatically
3. Provides shared helper methods for API calls and file uploads

### `auth.js` does login/session management
It stores:
- `lannent_session`
- `lannent_token`

It also maps each role to a dashboard page:

- client → `client-dashboard.html`
- worker → `worker-dashboard.html`
- expert → `expert-dashboard.html`
- superuser → `superuser-dashboard.html`
- revenue-admin → `admin-revenue.html`
- intake-admin → `admin-expert-applications.html`
- compliance-admin → `compliance-dashboard.html`

### Frontend pages
Pages represent different actor interfaces:
- login.html / signup.html
- client-dashboard.html
- worker-dashboard.html
- expert-dashboard.html
- superuser-dashboard.html
- admin-revenue.html
- admin-expert-applications.html
- compliance-dashboard.html

The page logic is mostly JS-driven and fetches data from API endpoints.

---

## 11) Task lifecycle and business logic

### Core flow
1. Client creates a task
2. If task requires audit, it becomes a draft first
3. Task is opened after audit conditions are met
4. Worker submits proposal or gets assigned
5. Project starts
6. Milestones are created and worked on
7. Worker submits milestone deliverable
8. Client or reviewer approves
9. Money is released from escrow

### `TasksService.create()`
- creates a `task` object
- if `auditEnabled` is true, task starts as `draft`
- it creates an audit request if an expert reviewer was selected
- if no expert is selected for that audit, the task is cancelled

This ensures the technical audit gate is real, not just a UI flag.

### Draft projects
Draft tasks are hidden from general browsing and only the client can see them until the audit is passed and funded.

---

## 12) Milestones and payments

Milestones are the fundamental payment unit.

When a client approves a milestone:
- money is released from escrow
- worker receives payment
- fees may be applied according to platform rules

The critical logic is inside `LedgerService`.

---

## 13) Revenue model and money flow

This is the most important part of the project.

### 13.1 Wallet model
Every user has a wallet balance.

- Clients fund wallet to pay for tasks and escrow
- Workers receive payouts
- Experts receive audit payments
- Platform fees are taken from transactions

### 13.2 Escrow model
The project uses escrow to reduce risk.

When a client funds a project:
- wallet balance is reduced
- funds are held in project escrow
- project budget is kept separated from fee payments

When work is approved:
- project milestone amount is released from escrow to worker
- platform fees are charged based on configured rates

### 13.3 Fees
The app uses a configuration file `ledger/fee-config.ts` to calculate fees.

Examples:
- deposit processing fee
- withdrawal processing fee
- client marketplace fee
- contract initiation fee
- worker service fee
- expert service fee

The actual calculations happen in `LedgerService` and are recorded in the revenue ledger.

### 13.4 Why this matters
The system deliberately avoids a bug where money appears from nowhere.

The code comments in `LedgerService` explain that the old system did not properly debit and credit at the same time. This project fixes that by ensuring:

- wallet deductions happen
- escrow holds are recorded
- revenue is tracked
- transactions balance correctly

### 13.5 Revenue and analytics
`RevenueService` reads the ledger and transaction history and generates:
- total revenue
- gross volume
- take rate
- escrow held
- per-fee breakdown
- per-user earnings
- per-project revenue calculation
- timeseries trend data

These are used by the revenue admin dashboards.

---

## 14) How admin roles are different

This is the part you should know deeply for evaluation.

### Superuser
The `superuser` is the platform operator.

Responsibilities:
- user management
- project/task oversight
- wallet movement permissions
- reset seed data
- access to operations-level features
- can view many records in broad operational sense

Important rule:
- `superuser` is not the same as `revenue-admin`
- `superuser` is not the same as intake or compliance admin

In the code: `canMoveAnyWallet()` only allows `superuser`, not other admin roles.

This means the superuser has operational power but not necessarily financial strategy power.

### Revenue admin
This role cares about the money side.

Responsibilities:
- view revenue summaries
- inspect transactions by fee type, by user, by project
- view platform take rate
- update fee configuration values

This role has access to financial analytics and can edit fee settings.

Important:
- it can read financial data
- it can change fee config
- it should not be treated as a general operations admin

### Intake admin
This role handles expert applications.

Responsibilities:
- review expert reviewer applications
- approve or reject applications
- auto-create expert accounts on approval

This is specifically tied to expert onboarding and evaluator access.

### Compliance admin
This role is a read-only oversight role.

Responsibilities:
- read audit log
- inspect admin activity trail
- review platform events and actions
- check for audit patterns

Important:
- it cannot change most things
- it exists to monitor and verify behavior
- it is allowed to read more broadly, but not perform operations

---

## 15) Special admin separation logic

The code makes a big point of splitting the old single generic admin role into separate desk roles.

This is implemented in `back-end/src/common/constants/roles.ts` and `viewer.util.ts`.

Example rules:
- `superuser` + `compliance-admin` can view any record
- only `superuser` can move money from any wallet
- only `superuser` can delete any uploaded file
- revenue-admin is not allowed to move wallets
- intake-admin is not allowed to adjust financial settings
- compliance-admin can read records, not change system behavior

This is a strong design decision and a good evaluation point because it shows the developer is thinking about privilege separation and security.

---

## 16) Audit and compliance model

### Audit middleware
`AdminAuditMiddleware` monitors admin actions on sensitive routes.

It records:
- read actions (`admin.read`)
- changes (`admin.change`)
- HTTP status result
- which route was triggered

### `AuditService`
This service keeps the audit ledger and supports filtering, export, and CSV export.

The compliance admin can read logs but not rewrite them.

This is important because the project treats audit logs as evidence, not editable data.

---

## 17) Expert application flow

This is the intake workflow.

### Flow
1. Applicant fills expert application form
2. Files may be uploaded
3. Application stored temporarily
4. Intake admin reviews it
5. If approved, an expert account is auto-created
6. The new expert can log in with the password supplied in the application

Important logic:
- application stores the chosen password hashed before saving
- approval creates the expert user account automatically
- if approval fails, it is logged clearly

This is handled in `ExpertApplicationsService`.

---

## 18) Audit request and technical review flow

A project with `auditEnabled` creates a technical review process.

### Why
The project has a quality-control layer so the client does not rely only on a worker’s work without expert review.

### Flow
1. Client creates a task with an expert reviewer specified
2. Audit request is created
3. Reviewer previews work and negotiates audit fee
4. Client funds audit escrow
5. Expert reviews milestone or dispute
6. Verdict is returned
7. Expert gets paid from escrow if report is accepted

This is handled by `audit-requests`, `audit-reports`, and `ledger` services together.

---

## 19) Dispute handling

If a client and worker disagree, a dispute can be raised.

The project allows a dispute to be assigned to an expert reviewer.

The expert evaluates the claim and the evidence and provides a verdict.

The platform uses this as part of the trust and quality-control mechanism.

---

## 20) Files and uploads

The files module allows users to upload project files, deliverables, and application documents.

The frontend uploads files using `FormData` and includes auth headers.

This matters because plain browser links to files would not carry the JWT. The project handles this by intercepting file downloads and forcing authenticated fetches.

---

## 21) What is the main idea of the project?

The project is a marketplace + quality-control + financial control platform.

It addresses common freelance platform problems:
- trust between client and worker
- quality inconsistency
- money security
- dispute resolution
- platform fees and revenue monitoring

It is not just a task board. It is a full operational model with:
- work lifecycle
- reviewer layer
- payment escrow
- admin oversight
- transaction analytics

---

## 22) One-sentence summary of each major part

### Frontend
The frontend is a static dashboard-based interface with separate pages for different users and roles.

### Backend
The backend is a NestJS API that manages users, tasks, money, audits, disputes, and role access.

### Authentication
Authentication is JWT-based with a token stored in localStorage and checked through middleware/guards.

### Storage
Most data is stored in memory through repositories and seed files, which makes the app easy to demo and test.

### Money system
The project uses escrow + wallet flows + fee calculation + ledger-based transaction tracking.

### Admin logic
The admin system splits responsibilities across superuser, revenue-admin, intake-admin, and compliance-admin.

---

## 23) Final evaluation-friendly summary

If you need a quick answer for evaluation, say:

> This project is a freelancing marketplace with client, worker, expert reviewer, and admin roles. The frontend is static HTML/JS pages that call a NestJS backend API. The backend manages tasks, milestones, proposals, wallet balances, escrow, audits, disputes, and revenue analytics. Authentication uses JWT and role-based guards. Data is stored in in-memory repositories seeded from demo data. The money model is escrow-based and ledger-driven. The superuser handles platform operations, the revenue admin handles money and fee configuration, the intake admin handles expert applications, and the compliance admin monitors audit logs and platform activity.

---

## 24) Most important files to read for understanding

- `back-end/src/app.module.ts` — backend app wiring and middleware chain
- `back-end/src/main.ts` — startup, CORS, static hosting, validation
- `back-end/src/common/constants/roles.ts` — all admin and user roles
- `back-end/src/common/middleware/auth.middleware.ts` — token validation and identity enforcement
- `back-end/src/common/guards/role.guard.ts` — role access control
- `back-end/src/modules/users/users.service.ts` — user logic and signup rules
- `back-end/src/modules/tasks/tasks.service.ts` — task lifecycle and drafts
- `back-end/src/modules/ledger/ledger.service.ts` — escrow and money movement
- `back-end/src/modules/revenue/revenue.service.ts` — platform financial analytics
- `back-end/src/modules/expert-applications/expert-applications.service.ts` — reviewer intake flow
- `front-end/js/auth.js` — login sessions and dashboard routing
- `front-end/js/store.js` — frontend API wrapper and auth headers
- `back-end/src/modules/seed/seed.data.ts` — app data and demo actors

This list is enough to understand the system quickly.
