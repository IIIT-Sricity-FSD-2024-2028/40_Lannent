import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MilestonesService } from '../src/modules/milestones/milestones.service';
import { DisputesService } from '../src/modules/disputes/disputes.service';

/**
 * The admin desks' figures must agree with the money that actually moved.
 *
 * Each test runs real flows through the API, then `reconcile()` reads every
 * admin endpoint (revenue summary, fee types, timeseries, distribution,
 * per-project and per-user views, the ledger summary, escrow per project) and
 * checks them against each other, against the transaction log, against the
 * milestones still owed, and against every wallet's change in balance.
 */
describe('Admin figures reconcile (e2e)', () => {
  let app: INestApplication;
  const token: Record<string, string> = {};
  const LOGINS: Record<string, [string, string]> = {
    client: ['client@gmail.com', 'Password@123'], // u1
    bob: ['bob@gmail.com', 'Password@123'], // u8
    worker: ['worker@gmail.com', 'Password@123'], // u2
    sarah: ['sarah@gmail.com', 'Password@123'], // u5
    expert: ['expert@gmail.com', 'Password@123'], // u3
    priya: ['priya@gmail.com', 'Password@123'], // u9
    super: ['super@gmail.com', 'Superadmin@123'], // u4
    revenue: ['admin@gmail.com', 'Admin@123'], // u11
    compliance: ['compliance@gmail.com', 'Compliance@123'],
  };
  const api = () => request(app.getHttpServer());
  let ip = 1;
  const login = (body: any) => api().post('/api/auth/login').set('X-Forwarded-For', `10.1.0.${ip++}`).send(body);
  const as = (who: string) => ({ Authorization: `Bearer ${token[who]}` });
  const get = (who: string, path: string) => api().get('/api' + path).set(as(who));
  const post = (who: string, path: string, body: any = {}) => api().post('/api' + path).set(as(who)).send(body);
  const patch = (who: string, path: string, body: any = {}) => api().patch('/api' + path).set(as(who)).send(body);
  const del = (who: string, path: string) => api().delete('/api' + path).set(as(who));
  const data = async (who: string, path: string) => {
    const res = await get(who, path);
    if (res.status !== 200) throw new Error(`GET ${path} as ${who} → ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
    return res.body.data;
  };
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const sum = (rows: any[], pick: (x: any) => number) => r2(rows.reduce((a, x) => a + (Number(pick(x)) || 0), 0));
  const DAY = 86_400_000;
  const FINDINGS = 'Reviewed the code, the tests and the deployment notes. Meets the brief.';
  const DELIV = { title: 'v1', link: 'https://github.com/example/work' };

  const OWNER: Record<string, string> = { u1: 'client', u8: 'bob' };
  const take = async (who: string, taskId: string) => {
    const a = await post(who, '/proposals', { taskId });
    if (a.status !== 201) return a;
    const owner = OWNER[(await data('super', `/tasks/${taskId}`)).clientId];
    return post(owner, `/proposals/${a.body.data.id}/accept`);
  };
  const engage = async (payer: string, reviewer: string, arId: string) => {
    const ar = await data(reviewer, `/audit-requests/${arId}`);
    const pending = ar.offers.find((o: any) => o.status === 'pending');
    expect((await post(reviewer, `/audit-requests/${arId}/offers/${pending.id}/accept`)).status).toBe(201);
    expect((await post(payer, `/audit-requests/${arId}/fund`)).status).toBe(201);
    expect((await post(reviewer, `/audit-requests/${arId}/accept`, {})).status).toBe(201);
  };

  /** Wallets and the transaction count when the test started. */
  let start: { balances: Record<string, number>; txCount: number };
  const snapshot = async () => {
    const users = await data('super', '/users');
    const txs = await data('super', '/transactions');
    return { balances: Object.fromEntries(users.map((u: any) => [u.id, Number(u.walletBalance) || 0])), txCount: txs.length };
  };

  /** Every cross-check between the admin figures and the underlying money. Returns the problems found. */
  const reconcile = async (): Promise<string[]> => {
    const problems: string[] = [];
    const eq = (label: string, a: number, b: number) => {
      if (Math.abs(r2(a) - r2(b)) > 0.005) problems.push(`${label}: ${r2(a)} ≠ ${r2(b)}`);
    };

    const summary = await data('revenue', '/revenue/summary');
    const byFee = await data('revenue', '/revenue/by-fee-type');
    const dist = await data('revenue', '/revenue/distribution');
    const byProject = await data('revenue', '/revenue/by-project');
    const byUser = await data('revenue', '/revenue/by-user');
    const ledger = await data('super', '/ledger/summary');
    const txs = await data('super', '/transactions');
    const tasks = await data('super', '/tasks');
    const users = await data('super', '/users');
    const allMs = await data('super', '/milestones');

    // 1. Total revenue is the same everywhere it is shown.
    eq('revenue: summary vs ledger summary', summary.totalRevenue, ledger.totalRevenue);
    eq('revenue: summary vs Σ fee types', summary.totalRevenue, sum(byFee, r => r.total));
    eq('revenue: summary vs Σ revenue entries', summary.totalRevenue, sum(ledger.revenueEntries, r => r.amount));
    for (const period of ['day', 'week', 'month']) {
      const ts = await data('revenue', `/revenue/timeseries?period=${period}`);
      eq(`revenue: summary vs Σ timeseries(${period})`, summary.totalRevenue, sum(ts, r => r.revenue));
      eq(`fee events: summary vs Σ timeseries(${period})`, summary.feeEvents, sum(ts, r => r.events));
    }
    eq('fee events: summary vs Σ fee-type counts', summary.feeEvents, sum(byFee, r => r.count));
    // Each share is rounded to 2 places, so the total may be off by a few hundredths.
    const shares = byFee.length ? sum(byFee, r => r.share) : 100;
    if (Math.abs(shares - 100) > 0.05) problems.push(`fee-type shares add to ${shares}%`);

    // 2. Each fee type matches the fees recorded on the transactions that charged it.
    const feeOf = (t: string) => byFee.find((r: any) => r.feeType === t)?.total || 0;
    const txFee = (types: string[]) => sum(txs.filter((t: any) => types.includes(t.type)), t => t.feeAmount);
    eq('deposit fees vs deposit rows', feeOf('deposit-processing'), txFee(['deposit']));
    eq('withdrawal fees vs withdrawal rows', feeOf('withdrawal-processing'), txFee(['withdrawal']));
    eq('worker service vs release rows', feeOf('worker-service'), txFee(['milestone-release']));
    eq('reviewer commission vs audit/dispute payout rows', feeOf('expert-service'), txFee(['audit-release', 'dispute-fee-release']));
    eq('cancellation fees vs cancellation rows', feeOf('cancellation'), sum(txs.filter((t: any) => t.type === 'cancellation-fee'), t => t.grossAmount ?? t.amount));
    eq('hire fees vs platform-fee rows', r2(feeOf('client-marketplace') + feeOf('contract-initiation')),
      sum(txs.filter((t: any) => t.type === 'platform-fee'), t => t.grossAmount ?? t.amount));

    // 3. Gross volume is what was paid out to workers and reviewers.
    eq('gross volume vs payout rows', summary.grossVolume,
      sum(txs.filter((t: any) => ['milestone-release', 'audit-release', 'dispute-fee-release'].includes(t.type)), t => t.grossAmount ?? t.amount));
    eq('take rate', summary.takeRate, summary.grossVolume > 0 ? r2((summary.totalRevenue / summary.grossVolume) * 100) : 0);

    // 4. The distribution accounts for every rupee funded into escrow.
    eq('distribution: unaccounted', dist.unaccounted, 0);
    eq('distribution: accounted vs funded', dist.accounted, dist.totalFunded);
    eq('distribution: funded vs escrow lock rows', dist.totalFunded,
      sum(txs.filter((t: any) => ['escrow-lock', 'audit-escrow-lock', 'dispute-escrow-lock'].includes(t.type)), t => t.netAmount ?? t.amount));

    // 5. Escrow held is the same in every view, and matches the rows per project and bucket.
    const heldByTask: Record<string, any> = ledger.escrowByTask || {};
    const heldTotal = sum(Object.values(heldByTask), (e: any) => e.projectHeld + e.auditHeld + e.disputeHeld);
    eq('escrow: summary vs ledger summary', summary.escrowHeld, ledger.totalHeld);
    eq('escrow: ledger total vs Σ per project', ledger.totalHeld, heldTotal);
    const taskIds = new Set<string>([...Object.keys(heldByTask), ...txs.filter((t: any) => t.taskId).map((t: any) => t.taskId)]);
    for (const id of taskIds) {
      const rows = txs.filter((t: any) => t.taskId === id);
      const g = (t: any) => t.grossAmount ?? t.amount;
      const n = (t: any) => t.netAmount ?? t.amount;
      const of = (type: string) => rows.filter((t: any) => t.type === type);
      const refunds = (bucket: string) => rows.filter((t: any) => t.type === 'refund' && (t.bucket || 'project') === bucket);
      const e = heldByTask[id] || { projectHeld: 0, auditHeld: 0, disputeHeld: 0 };
      eq(`escrow ${id}: project bucket vs rows`, e.projectHeld,
        sum(of('escrow-lock'), n) - sum(of('milestone-release'), g) - sum(of('cancellation-fee'), g) - sum(refunds('project'), g));
      eq(`escrow ${id}: audit bucket vs rows`, e.auditHeld, sum(of('audit-escrow-lock'), n) - sum(of('audit-release'), g) - sum(refunds('audit'), g));
      eq(`escrow ${id}: dispute bucket vs rows`, e.disputeHeld, sum(of('dispute-escrow-lock'), n) - sum(of('dispute-fee-release'), g) - sum(refunds('dispute'), g));
      if (e.projectHeld < -0.005 || e.auditHeld < -0.005 || e.disputeHeld < -0.005) problems.push(`escrow ${id}: negative balance ${JSON.stringify(e)}`);
    }

    // 6. Project escrow matches what the project still owes its worker.
    for (const t of tasks) {
      const e = heldByTask[t.id] || { projectHeld: 0 };
      const ms = allMs.filter((m: any) => m.taskId === t.id);
      if (['open', 'draft'].includes(t.status)) eq(`escrow ${t.id} (${t.status}): held vs budget`, e.projectHeld, t.budget);
      else if (t.status === 'in-progress') {
        eq(`escrow ${t.id} (in progress): held vs unpaid milestones`, e.projectHeld,
          sum(ms.filter((m: any) => !['completed', 'approved', 'audit-passed', 'done', 'cancelled'].includes(m.status)), m => m.budget));
      } else eq(`escrow ${t.id} (${t.status}): nothing left held`, (e.projectHeld || 0) + (e.auditHeld || 0) + (e.disputeHeld || 0), 0);
    }

    // 7. The per-project table agrees with each project's breakdown, and with the total.
    for (const p of byProject) {
      if (p.status === 'unknown') continue; // a deleted project has no breakdown
      const b = await data('revenue', `/revenue/project/${p.taskId}`);
      eq(`project ${p.taskId}: table revenue vs breakdown`, p.platformRevenue, b.platformEarnings.total);
      eq(`project ${p.taskId}: table escrow vs breakdown`, p.escrowHeld, b.stillHeld.total);
      eq(`project ${p.taskId}: worker gross − fees = net`, r2(b.worker.grossReleased - b.worker.serviceFees), b.worker.netReceived);
      eq(`project ${p.taskId}: breakdown funded vs table`, p.funded,
        b.clientPaid.intoProjectEscrow + b.clientPaid.intoAuditEscrow + b.clientPaid.intoDisputeEscrow);
    }
    eq('Σ per-project revenue + wallet fees vs total', r2(sum(byProject, p => p.platformRevenue) + feeOf('deposit-processing') + feeOf('withdrawal-processing')),
      summary.totalRevenue);

    // 8. Every fee is attributed to the user who paid it.
    eq('Σ fees paid per user vs total revenue', sum(byUser, u => u.feesPaid), summary.totalRevenue);
    for (const u of byUser) {
      const real = users.find((x: any) => x.id === u.userId);
      if (real) eq(`by-user ${u.userId}: wallet shown`, u.walletBalance, real.walletBalance);
    }

    // 9. Every wallet changed by exactly what its new transactions say.
    const fresh = txs.slice(start.txCount);
    const effect: Record<string, number> = {};
    const add = (id: string, v: number) => { effect[id] = r2((effect[id] || 0) + v); };
    for (const t of fresh) {
      const g = t.grossAmount ?? t.amount, n = t.netAmount ?? t.amount;
      switch (t.type) {
        case 'deposit': add(t.toId, n); break;
        case 'withdrawal': add(t.fromId, -g); break;
        case 'escrow-lock': case 'audit-escrow-lock': case 'dispute-escrow-lock': add(t.fromId, -n); break;
        case 'platform-fee': add(t.fromId, -g); break;
        case 'milestone-release': case 'audit-release': case 'dispute-fee-release': add(t.toId, n); break;
        case 'refund': add(t.toId, g); break;
        case 'cancellation-fee': break; // taken from escrow, not a wallet
        default: problems.push(`unknown transaction type ${t.type}`);
      }
    }
    for (const u of users) {
      eq(`wallet ${u.id} (${u.name}): Δ balance vs Δ rows`, (Number(u.walletBalance) || 0) - (start.balances[u.id] || 0), effect[u.id] || 0);
    }
    return problems;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    (app as any).getHttpAdapter().getInstance().set('trust proxy', true);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    for (const [who, [email, password]] of Object.entries(LOGINS)) {
      const res = await login({ email, password });
      expect(res.status).toBe(201);
      token[who] = res.body.data.token;
    }
  });

  afterAll(async () => { await app.close(); });

  beforeEach(async () => {
    expect((await post('super', '/seed/reset')).status).toBe(201);
    start = await snapshot();
  });

  const milestones = () => app.get(MilestonesService);
  const disputes = () => app.get(DisputesService);

  it('agree on the seeded data', async () => {
    expect(await reconcile()).toEqual([]);
  });

  it('agree after deposits, withdrawals, a hire and tiered payouts', async () => {
    expect((await post('client', '/users/u1/wallet/add', { amount: 1100 })).status).toBe(201);
    expect((await post('worker', '/users/u2/wallet/withdraw', { amount: 100 })).status).toBe(201);
    const task = (await post('client', '/tasks', {
      title: 'Figures', description: 'Project details', category: 'Web Development', budget: 1000,
      milestones: [{ title: 'One', budget: 600 }, { title: 'Two', budget: 400 }],
    })).body.data;
    expect((await take('worker', task.id)).status).toBe(201);
    for (const m of (await data('client', `/milestones?taskId=${task.id}`))) {
      expect((await post('worker', `/milestones/${m.id}/submit`, { deliverable: DELIV })).status).toBe(201);
      expect((await post('client', `/milestones/${m.id}/approve`)).status).toBe(201);
    }
    expect((await data('client', `/tasks/${task.id}`)).status).toBe('completed');
    expect(await reconcile()).toEqual([]);
  });

  it('agree through an audit with one share paid and one forfeited', async () => {
    const task = (await post('client', '/tasks', {
      title: 'Audited figures', description: 'Project details', category: 'Web Development', budget: 1000,
      auditEnabled: true, auditExpertId: 'u3', auditFee: 200,
      milestones: [{ title: 'One', budget: 600 }, { title: 'Two', budget: 400 }],
    })).body.data;
    const ar = (await data('expert', `/audit-requests?taskId=${task.id}`))[0];
    await engage('client', 'expert', ar.id);
    expect((await take('worker', task.id)).status).toBe(201);
    const [m1, m2] = await data('client', `/milestones?taskId=${task.id}`);
    for (const m of [m1, m2]) await post('worker', `/milestones/${m.id}/submit`, { deliverable: DELIV });
    expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: m1.id, verdict: 'pass', findings: FINDINGS })).status).toBe(201);
    milestones().systemUpdate(m2.id, { submittedAt: new Date(Date.now() - 6 * DAY).toISOString() });
    for (const m of [m1, m2]) expect((await post('client', `/milestones/${m.id}/approve`)).status).toBe(201);
    expect(await reconcile()).toEqual([]);
  });

  it('agree through disputes: both verdicts, a withdrawal, an expiry and an override', async () => {
    const mk = async (title: string) => {
      const t = (await post('bob', '/tasks', { title, description: 'Project details', category: 'Web Development', budget: 300, milestones: [{ title: 'All', budget: 300 }] })).body.data;
      expect((await take('worker', t.id)).status).toBe(201);
      const [m] = await data('bob', `/milestones?taskId=${t.id}`);
      await post('worker', `/milestones/${m.id}/submit`, { deliverable: DELIV });
      return { t, m };
    };
    const raise = async (t: any, m: any, fee = 100) =>
      (await post('bob', '/disputes', { taskId: t.id, milestoneId: m.id, reason: 'Incomplete work', expertId: 'u3', reviewerFee: fee })).body.data;

    // Worker wins: milestone paid, reviewer paid.
    const a = await mk('Dispute A');
    const dA = await raise(a.t, a.m);
    await engage('bob', 'expert', dA.auditRequestId);
    expect((await post('expert', `/disputes/${dA.id}/resolve`, { verdict: 'worker-favour', resolution: 'The submitted work meets the brief.' })).status).toBe(201);

    // Client wins, then the rework is approved.
    const b = await mk('Dispute B');
    const dB = await raise(b.t, b.m, 150);
    await engage('bob', 'expert', dB.auditRequestId);
    expect((await post('expert', `/disputes/${dB.id}/resolve`, { verdict: 'client-favour', resolution: 'The checkout flow is incomplete.' })).status).toBe(201);
    await post('worker', `/milestones/${b.m.id}/submit`, { deliverable: DELIV });
    expect((await post('bob', `/milestones/${b.m.id}/approve`)).status).toBe(201);

    // Withdrawn after funding, before the reviewer accepts.
    const c = await mk('Dispute C');
    const dC = await raise(c.t, c.m);
    const arC = await data('expert', `/audit-requests/${dC.auditRequestId}`);
    await post('expert', `/audit-requests/${arC.id}/offers/${arC.offers.find((o: any) => o.status === 'pending').id}/accept`);
    expect((await post('bob', `/audit-requests/${arC.id}/fund`)).status).toBe(201);
    expect((await post('bob', `/disputes/${dC.id}/withdraw`)).status).toBe(201);

    // Expires with the fee funded and accepted, no verdict.
    const d = await mk('Dispute D');
    const dD = await raise(d.t, d.m);
    await engage('bob', 'expert', dD.auditRequestId);
    disputes().expireDue(Date.now() + 8 * DAY);
    // The expiry moved money with no request behind it; compliance still sees it.
    const expiryLog = await data('compliance', '/audit-log?kind=money');
    expect(expiryLog.events.some((e: any) => e.path === `/api/disputes/${dD.id}/expire` && e.actorRole === 'system')).toBe(true);

    // Operations overrides a stuck dispute.
    const e = await mk('Dispute E');
    const dE = await raise(e.t, e.m);
    await engage('bob', 'expert', dE.auditRequestId);
    expect((await post('super', `/disputes/${dE.id}/resolve`, { verdict: 'worker-favour', resolution: 'Settled by operations after review.' })).status).toBe(201);

    expect(await reconcile()).toEqual([]);
  });

  it('agree after cancellations, deletions, auto-approval and non-delivery', async () => {
    // t3 has been live for weeks: 5% of ₹1,200.
    expect((await patch('client', '/tasks/t3', { status: 'cancelled' })).status).toBe(200);
    // A fresh project deleted within the free window.
    const fresh = (await post('client', '/tasks', { title: 'Fresh', description: 'Project details', category: 'Web Development', budget: 200 })).body.data;
    expect((await del('client', `/tasks/${fresh.id}`)).status).toBe(200);
    // A draft waiting on its audit, cancelled with the audit fee funded.
    const draft = (await post('client', '/tasks', {
      title: 'Draft', description: 'Project details', category: 'Web Development', budget: 500, auditEnabled: true, auditExpertId: 'u3', auditFee: 80,
    })).body.data;
    const ar = (await data('expert', `/audit-requests?taskId=${draft.id}`))[0];
    await post('expert', `/audit-requests/${ar.id}/offers/${ar.offers[0].id}/accept`);
    await post('client', `/audit-requests/${ar.id}/fund`);
    expect((await post('client', `/tasks/${draft.id}/cancel-draft`)).status).toBe(201);
    // Auto-approval of a submission left for 8 days.
    const auto = (await post('bob', '/tasks', { title: 'Auto', description: 'Project details', category: 'Web Development', budget: 400, milestones: [{ title: 'All', budget: 400 }] })).body.data;
    await take('worker', auto.id);
    const [am] = await data('bob', `/milestones?taskId=${auto.id}`);
    await post('worker', `/milestones/${am.id}/submit`, { deliverable: DELIV });
    milestones().autoApproveDue(Date.now() + 8 * DAY);
    const autoLog = await data('compliance', '/audit-log?kind=money');
    expect(autoLog.events.some((e: any) => e.path === `/api/milestones/${am.id}/auto-approve` && e.actorRole === 'system')).toBe(true);
    // Non-delivery: one milestone paid, one never delivered.
    const nd = (await post('bob', '/tasks', {
      title: 'Gone quiet', description: 'Project details', category: 'Web Development', budget: 500,
      milestones: [{ title: 'Done', budget: 200 }, { title: 'Never', budget: 300 }],
    })).body.data;
    await take('sarah', nd.id);
    const [n1] = await data('bob', `/milestones?taskId=${nd.id}`);
    await post('sarah', `/milestones/${n1.id}/submit`, { deliverable: DELIV });
    await post('bob', `/milestones/${n1.id}/approve`);
    milestones().systemUpdate(n1.id, { submittedAt: new Date(Date.now() - 40 * DAY).toISOString() });
    const tasksRepo: any = (app as any).get(require('../src/modules/tasks/tasks.repository').TasksRepository);
    tasksRepo.update(nd.id, { hiredAt: new Date(Date.now() - 40 * DAY).toISOString() });
    const end = await post('bob', `/tasks/${nd.id}/end-for-non-delivery`);
    expect(end.status).toBe(201);

    expect(await reconcile()).toEqual([]);
  });

  it('keep past revenue at its old rate after a fee change, and log the change', async () => {
    const before = await data('revenue', '/revenue/summary');
    expect((await patch('revenue', '/revenue/fee-config', { clientMarketplacePercent: 8 })).status).toBe(200);
    expect((await data('revenue', '/revenue/summary')).totalRevenue).toBe(before.totalRevenue);
    const task = (await post('client', '/tasks', { title: 'New rate', description: 'Project details', category: 'Web Development', budget: 1000, milestones: [{ title: 'All', budget: 1000 }] })).body.data;
    await take('worker', task.id);
    const b = await data('revenue', `/revenue/project/${task.id}`);
    expect(b.platformEarnings.marketplaceFee).toBe(80);
    const log = await data('compliance', '/audit-log?kind=fee.change');
    expect(JSON.stringify(log.events)).toContain('"after":8');
    expect(await reconcile()).toEqual([]);
    await patch('revenue', '/revenue/fee-config', { clientMarketplacePercent: 5 });
  });
});
