---
name: verify
description: Build, run and drive the Lannent app (NestJS API + static frontend) to observe changes at their real surface.
---

# Verifying Lannent

Two surfaces: a **static multi-page frontend** (browser) and a **NestJS API** (HTTP).
Most changes land in the browser — drive there, not through the API alone.

## Launch

```bash
# API — in-memory store, seeded on boot, port 3000, global prefix /api
cd back-end && npm install && npm run start:dev     # wait for 200 on /api/tasks

# Frontend — no build step, plain static files
cd front-end && python3 -m http.server 8080
```

Health: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/tasks`

Reset seed data between runs (undoes wallet/status mutations):
```bash
curl -s -X POST http://localhost:3000/api/seed/reset -H "role: superuser" -H "user-id: u4"
```
Refused when `NODE_ENV=production`. `PORT`, `JWT_SECRET`, `CORS_ORIGIN` and
`RATE_LIMIT_PER_MIN` are all read from the environment; `JWT_SECRET` (32+ chars)
is **required** to boot in production.

## Gotchas

- **Auth is a bearer token, with the `role` header as a fallback.** `POST /api/auth/login`
  returns `{ token, user, session }`; the browser keeps the token in
  `localStorage['lannent_token']` beside `localStorage['lannent_session']`
  (`{userId, role, name, email, avatar, avatarColor}`) and sends
  `Authorization` plus `role` + `user-id`. A verified token **overrides** the
  headers, so you cannot spoof a role past one. Seeding a session with
  `addInitScript` still works — the header fallback identifies you with no token.
- **Almost every route now 401s without credentials.** Exactly five are public:
  `POST /auth/login`, `POST /users/login`, `POST /users` (signup),
  `POST /expert-applications`, `GET /expert-applications/status`. `POST /files/application`
  is public too. Every other call needs a token or the `role` header — including
  `POST /seed/reset`, which also wants `user-id`.
- **User text is stripped of HTML on the way in.** `SanitizeMiddleware` removes
  complete tags from every string in a mutation body, so a payload posted for an
  XSS test comes back without it. `3 < 5` and `x<y` survive; `List<String>` does not.
  Passwords are exempt.
- **Pages ship an empty `<body>` by design.** `initDashboard()` in `js/dashboard.js`
  replaces `document.body.innerHTML`. An empty body is normal at parse time, not a bug.
- **`Store.init()` fires 11 blocking sync XHRs at script load.** Everything is
  cached synchronously before pages render; `Store.isOnline()` reports reachability.
- **Detail pages need a query param** — `?id=t1` (tasks), `?id=m6` (milestones),
  `?id=ar1` (audit requests), `?id=d1` (disputes). Without one they show an empty state.
- **jsdom needs a tick** before measuring: DOMContentLoaded fires on a later tick.

## Driving with Playwright

Chromium is not installed by default: `npx playwright install chromium` (slow, ~4 min).

```js
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(s => localStorage.setItem('lannent_session', s),
  JSON.stringify({ userId:'u1', role:'client', name:'James Client',
                   email:'client@gmail.com', avatar:'JC', avatarColor:'' }));
```

Separate `pageerror` (real crashes) from `console` type `error` — with the API
stopped you get 11 harmless `ERR_CONNECTION_REFUSED` console errors per page.

## Seed accounts

| role | id | email | password |
|---|---|---|---|
| client | u1 | client@gmail.com | Password@123 |
| worker | u2 | worker@gmail.com | Password@123 |
| expert | u3 | expert@gmail.com | Password@123 |
| superuser | u4 | super@gmail.com | Superadmin@123 |
| admin | u11 | admin@gmail.com | Admin@123 |

`index.html` demo buttons link to `login.html?demo=<role>` and prefill the form.

## Money model (Phase 2+)

Every movement goes through `LedgerService` — nothing else touches wallets.
Read the authoritative state at `GET /api/ledger/summary` (superuser):
`{ totalHeld, totalRevenue, escrowByTask, revenueEntries }`.

**The invariant to check after any money change:**
`wallets + escrow held + platform revenue` is constant across internal moves,
and changes by exactly the amount crossing the boundary on deposit/withdraw.

**Do not derive escrow by summing transaction rows.** A `milestone-release`
row records the NET paid to the worker; the gross left escrow. Rows carry
`grossAmount` / `feeAmount` / `netAmount` — use those.

Fees: deposit 2.9%+$0.30 · funding 5% + $0.99–14.99 initiation · worker
20/10/5% by lifetime billings with that client · expert 10% · withdrawal
0.25%+$0.25. Mirrored client-side in `Store.Fees.*` for previews.

Releases are idempotent per milestone and per audit request — approving twice
returns `alreadyReleased: true` and pays nothing.

## Audit engagements (Phase 3+)

An audit is a hired, priced, escrow-paid engagement, not a flag:
`preview-sent → negotiating → agreed → escrow-funded → in-progress → paid`
(exits: `declined`, `cancelled`). Status is owned by the lifecycle endpoints —
`PATCH /audit-requests/:id` deliberately cannot set it.

**Draft projects**: `auditEnabled` creates the task as `draft`. It is excluded
from `GET /tasks` **except for its own client**, matched on the `user-id`
header — so a Store call without that header will not see it. `PATCH /tasks/:id`
refuses to move a draft to `open`; only an accepted audit publishes it.

**Gotcha**: `create()` in `audit-requests.service.ts` spreads the payload FIRST
then applies defaults. Most services in this repo do the reverse, which lets a
present-but-undefined key clobber its own default — that produced engagements
with `status: undefined`. Watch for it when touching any other `create()`.

## Staff roles

`superuser` and `admin` are separate staff roles, not synonyms:
SuperUser runs operations (users, tasks, escrow, disputes); Admin owns the
revenue model and Expert Reviewer intake. `PATCH /expert-applications/:id/status`
is `@Roles(ROLES.ADMIN)` — a superuser gets a 403. Valid roles live in
`src/common/constants/roles.ts`; a new role must be added there, in the SQL
ENUM, and in `DASHBOARDS` in `js/auth.js`, or logins for it land nowhere.

Both staff roles use `staff-settings.html` (they have no `profile-settings.html`
access — that page is client-guarded).

## Revenue model (Phase 5+)

`GET /api/revenue/*` is **admin-only** — superuser gets a 403, by design.
`summary`, `by-fee-type`, `timeseries?period=day|week|month`, `by-user`,
`distribution`, and `GET|PATCH fee-config`.

Everything is derived from the ledger, nothing stored twice, so these must
always reconcile: summary total = ledger total = by-fee-type sum = timeseries
sum, and `distribution.unaccounted` must be **0**. A non-zero `unaccounted`
means the transaction log and the revenue entries disagree — that check caught
two real bugs (escrow-lock `grossAmount` is what the client PAID, not what
entered escrow; and seeded fee-bearing rows must hydrate as revenue).

Rate changes apply to future charges only — recorded revenue keeps the rate it
was charged at. `admin-fee-config.html` computes its worked example from the
unsaved draft, so a rate change is visible before saving.

`POST /seed/reset` restores the default rates too — fee config is part of the
known state, not separate configuration.

Charts are hand-rolled inline SVG (no Chart.js) using the validated palette in
`css/styles.css` under `.viz`. If you change chart colours, re-run the dataviz
validator; don't eyeball CVD safety. **The palette is light-only on purpose** —
Lannent has no dark theme anywhere, so dark chart steps would paint
dark-surface hues onto a white page. Add them only if the app itself gains a
dark theme.

## Form gates (they will block your automation)

Several forms disable Submit until every rule passes. Satisfy them, don't fight them:
- **expert-signup**: a resume PDF via `#expResume` is required.
- **post-task**: budget is the first `.section-card input[type=number]` (no id);
  milestones go through Add Milestone → `#newMilestoneTitle` / `#newMilestoneDesc`
  / `#newMilestoneBudget` → Save.
- **task-details apply**: `#timelineInput` is a `<select>`, `#coverLetterInput` a
  textarea. The bid is auto-set to the task budget — a worker cannot name a price.
- **submit-deliverable**: file + `#repoUrl` + `#branchName` + `#deliverableTitle`
  + `#deliverableNotes` + every `input.checklist-item` ticked.
- **review-deliverable**: the review checklist items are clickable `.checklist-item`
  divs, not checkboxes. Approve is inert until all are ticked — and `#approveBtn`
  only opens a modal. The API call comes from `[onclick="confirmRelease()"]` inside
  it, so a click on Approve alone moves no money and fires no POST.
- **messages / workroom**: send with the Enter key — the send control is an icon
  button with no text.

## Flows worth driving

- **Withdrawal** (`worker-wallet.html`): Withdraw Funds → amount → ✓ Confirm.
  Check the server balance moved via `GET /api/users/u2`, then reload — a
  cache-only debit looks identical until you reload.
- **Audit accept** (`expert-audit-requests.html`): Accept flips the badge to
  "In Review" and persists as `In-Progress`.
- **Offline**: kill the API, reload any dashboard — expect a `.offline-banner`
  with the sidebar still intact, not a blank page.
- **Hire** (`worker-applications.html`): master-detail — you must click a
  `.proposal-item` first, then `[onclick^="openHireModal"]` appears. The modal
  must quote the same total the client is actually charged.
- **Wallet fees**: the deposit/withdraw modal previews come from `Store.Fees.*`
  and must match what the server returns in `{ gross, fee, net, balance }`.
- **Audit negotiation**: post an audited task → `expert-audit-preview.html?id=<ar>`
  to quote → `client-audit-offers.html` to accept and fund → back to the preview
  to accept the engagement. Confirm the task flips `draft → open` and only then
  appears in `browse-tasks.html`.
- **Decline recovery**: an expert declining leaves the project a draft; the
  client's offers page must offer "Find another reviewer".
- **Expert intake**: sign in as admin → `admin-expert-applications.html` →
  `.btn-approve` → `#confirmBtn`. Approving auto-creates the reviewer account.
  Selector trap: the "Approved" filter pill also matches `has-text("Approve")`,
  so target `.btn-approve`, not the text.
- **Revenue dashboard**: sign in as admin → `admin-revenue.html`. Hover the line
  chart for the crosshair tooltip; "Show data table" is the accessibility relief
  for the low-contrast palette slots. After changing chart geometry, check no
  `<text>` overflows the viewBox — end labels need `text-anchor` start/end.

## Sweeping every page

`render.js` in the session scratchpad renders all 45 role/page combos in jsdom
and reports body size + errors. Useful as a fast regression net before
reaching for a real browser.
