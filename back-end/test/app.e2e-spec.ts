import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MilestonesService } from '../src/modules/milestones/milestones.service';
import { DisputesService } from '../src/modules/disputes/disputes.service';

/**
 * End-to-end checks against the real module graph.
 *
 * The "refused" block replays exploits that worked against the API before
 * ownership checks existed — each one moved money, rewrote someone else's
 * record, or let one user act as another. The "still works" block walks the
 * legitimate flows those checks must not break.
 */
describe('Lannent API (e2e)', () => {
  let app: INestApplication;
  const token: Record<string, string> = {};

  const LOGINS: Record<string, [string, string]> = {
    client: ['client@gmail.com', 'Password@123'], // u1
    bob: ['bob@gmail.com', 'Password@123'], // u8
    worker: ['worker@gmail.com', 'Password@123'], // u2
    sarah: ['sarah@gmail.com', 'Password@123'], // u5, worker on t1
    michael: ['michael@gmail.com', 'Password@123'], // u6
    expert: ['expert@gmail.com', 'Password@123'], // u3
    priya: ['priya@gmail.com', 'Password@123'], // u9
    super: ['super@gmail.com', 'Superadmin@123'], // u4
    revenue: ['admin@gmail.com', 'Admin@123'], // u11
    intake: ['intake@gmail.com', 'Intake@123'], // u12
  };

  const api = () => request(app.getHttpServer());
  let ip = 1;
  const login = (body: any) => api().post('/api/auth/login').set('X-Forwarded-For', `10.0.0.${ip++}`).send(body);
  const as = (who: string) => ({ Authorization: `Bearer ${token[who]}` });
  const get = (who: string, path: string) => api().get('/api' + path).set(as(who));
  const post = (who: string, path: string, body: any = {}) => api().post('/api' + path).set(as(who)).send(body);
  const patch = (who: string, path: string, body: any = {}) => api().patch('/api' + path).set(as(who)).send(body);
  const del = (who: string, path: string) => api().delete('/api' + path).set(as(who));
  const balance = async (id: string) => (await get('super', `/users/${id}`)).body.data.walletBalance;

  /** Payer accepts the reviewer's terms by accepting the pending offer, funds it, and the reviewer takes it on. */
  // Seed milestone m4 (t1, worked by Sarah) is pending; a dispute needs submitted work.
  const submitM4 = () => post('sarah', '/milestones/m4/submit', { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });
  const FINDINGS = 'Reviewed the code, the tests and the deployment notes. Meets the brief.';
  const OWNER: Record<string, string> = { u1: 'client', u8: 'bob' };
  /** The usual start of a contract: the worker applies at the posted budget and the project's client accepts. */
  const take = async (who: string, taskId: string) => {
    const app = await post(who, '/proposals', { taskId });
    if (app.status !== 201) return app;
    const owner = OWNER[(await get('super', `/tasks/${taskId}`)).body.data.clientId];
    return post(owner, `/proposals/${app.body.data.id}/accept`);
  };
  const engageReviewer = async (payer: string, reviewer: string, arId: string) => {
    const ar = (await get(reviewer, `/audit-requests/${arId}`)).body.data;
    const pending = ar.offers.find((o: any) => o.status === 'pending');
    expect((await post(reviewer, `/audit-requests/${arId}/offers/${pending.id}/accept`)).status).toBe(201);
    expect((await post(payer, `/audit-requests/${arId}/fund`)).status).toBe(201);
    expect((await post(reviewer, `/audit-requests/${arId}/accept`, {})).status).toBe(201);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // The same global setup as main.ts.
    app.setGlobalPrefix('api');
    // Login is limited to 10 a minute per client IP, and this suite signs in
    // more often than that. Each login below comes from its own address.
    (app as any).getHttpAdapter().getInstance().set('trust proxy', true);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Logins are rate-limited per IP, so sign in once each.
    for (const [who, [email, password]] of Object.entries(LOGINS)) {
      const res = await login({ email, password });
      expect(res.status).toBe(201);
      token[who] = res.body.data.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const DAY = 86_400_000;
  const milestones = () => app.get(MilestonesService);
  const disputes = () => app.get(DisputesService);

  beforeEach(async () => {
    const res = await post('super', '/seed/reset');
    expect(res.status).toBe(201);
  });

  describe('refused', () => {
    it('ignores a role header without a token', async () => {
      const res = await api().get('/api/users').set('role', 'superuser').set('user-id', 'u4');
      expect(res.status).toBe(401);
    });

    it('does not let a user set their own wallet balance', async () => {
      const before = await balance('u2');
      await patch('worker', '/users/u2', { walletBalance: 999999 });
      expect(await balance('u2')).toBe(before);
    });

    it('does not let a user edit or suspend someone else', async () => {
      expect((await patch('worker', '/users/u8', { status: 'suspended' })).status).toBe(403);
      expect((await patch('worker', '/users/u2', { status: 'suspended' })).status).toBe(403);
      // Project counts are derived, and there is no rating, so a PATCH sets neither.
      await patch('worker', '/users/u2', { rating: 5, completedProjects: 99 });
      const u2 = (await get('worker', '/users/u2')).body.data;
      expect(u2.completedProjects).toBe(0);
      expect(u2.rating).toBeUndefined();
    });

    it('does not wipe fields a PATCH did not send', async () => {
      const res = await patch('client', '/tasks/t1', { title: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: 'Renamed', status: 'in-progress', workerId: 'u5', progress: 75 });
    });

    it('keeps defaults when a create omits optional fields, and owns the task as the caller', async () => {
      const res = await post('client', '/tasks', { title: 'xyz', description: 'yyy', category: 'Web Development', budget: 100, clientId: 'u8' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ currency: 'INR', skills: [], auditEnabled: false, clientId: 'u1', status: 'open' });
    });

    it("does not let a client edit, delete or cancel another client's task", async () => {
      expect((await patch('bob', '/tasks/t3', { budget: 1 })).status).toBe(403);
      expect((await del('bob', '/tasks/t3')).status).toBe(403);
    });

    it('does not let a client reassign a worker or force a status', async () => {
      const res = await patch('client', '/tasks/t3', { workerId: 'u2', progress: 100, status: 'completed' });
      expect(res.status).toBe(400);
      const t3 = (await get('client', '/tasks/t3')).body.data;
      expect(t3).toMatchObject({ workerId: null, status: 'open', progress: 0 });
    });

    it('refuses to delete a project that holds escrow', async () => {
      expect((await del('client', '/tasks/t1')).status).toBe(403);
    });

    it('has no bidding: nobody names a price, and the contract is the posted budget', async () => {
      // The hire-a-bid route is gone, and a price or a different worker in the body is ignored.
      expect((await post('client', '/proposals/p1/hire')).status).toBe(404);
      const app = await post('worker', '/proposals', { taskId: 't3', bidPrice: 1, workerId: 'u6' });
      expect(app.status).toBe(201);
      expect(app.body.data).toMatchObject({ type: 'application', workerId: 'u2', status: 'pending' });
      expect(app.body.data.bidPrice).toBeUndefined();
      expect((await post('client', `/proposals/${app.body.data.id}/accept`)).status).toBe(201);
      expect((await get('client', '/tasks/t3')).body.data).toMatchObject({ workerId: 'u2', budget: 1200, contractPrice: 1200, status: 'in-progress' });
      // Sarah's and Michael's applications close.
      const rest = (await get('client', '/proposals?taskId=t3')).body.data.filter((p: any) => p.id !== app.body.data.id);
      expect(rest.length).toBe(2);
      expect(rest.every((p: any) => p.status === 'closed')).toBe(true);
    });

    it('takes an invitation\'s worker details from the record, not the request', async () => {
      const res = await post('client', '/proposals', { taskId: 't3', workerId: 'u2', workerName: 'Someone Else', rating: 5 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ workerName: 'Alex Worker', type: 'invitation', status: 'pending' });
      expect(res.body.data.rating).toBeUndefined();
    });

    it('lets only the other side answer: the client answers applications, the invited worker answers invitations', async () => {
      expect((await post('bob', '/proposals', { taskId: 't3', workerId: 'u6' })).status).toBe(403);
      // p1 is Sarah's application to James's t3.
      expect((await post('sarah', '/proposals/p1/accept')).status).toBe(403);
      expect((await post('sarah', '/proposals/p1/decline')).status).toBe(403);
      expect((await post('bob', '/proposals/p1/accept')).status).toBe(403);
      expect((await post('worker', '/proposals/p1/accept')).status).toBe(403);
      // p3 is Bob's invitation to Alex on t5.
      expect((await post('bob', '/proposals/p3/accept')).status).toBe(403);
      expect((await post('sarah', '/proposals/p3/accept')).status).toBe(403);
      // A client cannot apply to someone else's project.
      expect((await post('client', '/proposals', { taskId: 't5' })).status).toBe(403);
    });

    it('does not let a worker repoint, submit or approve milestones that are not theirs', async () => {
      // m3 is on t1, worked by u5 (sarah).
      await patch('worker', '/milestones/m3', { workerId: 'u2' });
      expect((await get('client', '/milestones/m3')).body.data.workerId).toBe('u5');
      expect((await post('worker', '/milestones/m3/submit', { deliverable: { title: 'x', link: 'https://github.com/example/work' } })).status).toBe(403);
      expect((await post('bob', '/milestones/m3/approve')).status).toBe(403);
    });

    it('resolves a dispute once, and only by its assigned reviewer', async () => {
      await submitM4();
      const d = await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'test', expertId: 'u3', reviewerFee: 150 });
      expect(d.status).toBe(201);
      const id = d.body.data.id;
      const verdict = { verdict: 'client-favour', resolution: 'The reviewer explains the verdict here.' };

      // A verdict before the reviewer's fee is agreed, funded and accepted is refused.
      expect((await post('expert', `/disputes/${id}/resolve`, verdict)).status).toBe(400);
      await engageReviewer('client', 'expert', d.body.data.auditRequestId);

      expect((await post('priya', `/disputes/${id}/resolve`, verdict)).status).toBe(403);
      const before = await balance('u1');
      expect((await post('expert', `/disputes/${id}/resolve`, verdict)).status).toBe(201);
      expect((await post('expert', `/disputes/${id}/resolve`, verdict)).status).toBe(400);
      // Client-favour sends the work back; no money moves.
      expect(await balance('u1')).toBe(before);
    });

    it('raises a dispute as the caller, against the other party', async () => {
      await submitM4();
      const d = await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', raisedBy: 'u5', againstId: 'u8', expertId: 'u3', reviewerFee: 100 });
      expect(d.body.data).toMatchObject({ raisedBy: 'u1', againstId: 'u5' });
      expect((await post('bob', '/disputes', { taskId: 't1', milestoneId: 'm3', reason: 'r', expertId: 'u3', reviewerFee: 100 })).status).toBe(403);
    });

    it('does not let a worker raise a dispute', async () => {
      await submitM4();
      expect((await post('sarah', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).status).toBe(403);
    });

    it('only allows a dispute on submitted work', async () => {
      expect((await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).status).toBe(400);
    });

    it('requires a reviewer and a fee to raise a dispute', async () => {
      await submitM4();
      expect((await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3' })).status).toBe(400);
      expect((await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', reviewerFee: 100 })).status).toBe(400);
    });

    it('does not let milestones add up to more than the budget', async () => {
      const task = (await post('client', '/tasks', { title: 'Capped', description: 'Project details', category: 'Web Development', budget: 500 })).body.data;
      expect((await post('client', '/milestones', { taskId: task.id, title: 'Part A', budget: 400 })).status).toBe(201);
      expect((await post('client', '/milestones', { taskId: task.id, title: 'Part B', budget: 200 })).status).toBe(400);
    });

    it('stops honouring the token of a suspended account', async () => {
      expect((await get('worker', '/users/u2')).status).toBe(200);
      expect((await patch('super', '/users/u2', { status: 'suspended' })).status).toBe(200);
      expect((await get('worker', '/users/u2')).status).toBe(401);
      await patch('super', '/users/u2', { status: 'active' });
    });

    it("hides other people's contact details and balances", async () => {
      const other = (await get('worker', '/users/u1')).body.data;
      expect(other.name).toBe('James Client');
      expect(other.email).toBeUndefined();
      expect(other.walletBalance).toBeUndefined();
      expect((await get('worker', '/users/u2')).body.data.walletBalance).toBeDefined();
    });

    it("hides another project's submitted work", async () => {
      // m6 is t2's submitted deliverable; bob has nothing to do with t2.
      expect((await get('bob', '/milestones/m6')).status).toBe(404);
      expect((await get('bob', '/milestones?taskId=t2')).body.data).toHaveLength(0);
      // An open project's plan is visible to a worker deciding whether to accept it.
      expect((await get('worker', '/milestones?taskId=t3')).body.data.length).toBe(3);
    });

    it('no longer accepts hand-written transactions, and keeps them private', async () => {
      const res = await post('worker', '/transactions', { type: 'milestone-release', amount: 50000, fromId: 'escrow', toId: 'u2' });
      expect(res.status).toBe(404);
      // A worker sees only money that moved to or from them — their payouts on
      // t1, not the client's escrow, fees or refunds on that same project.
      const mine = (await get('sarah', '/transactions?userId=u1')).body.data;
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.every((t: any) => t.fromId === 'u5' || t.toId === 'u5')).toBe(true);
      expect(mine.some((t: any) => t.type === 'escrow-lock' && t.taskId === 't1')).toBe(false);
      // A client still sees the releases paid out of their own escrow.
      const client = (await get('client', '/transactions')).body.data;
      expect(client.some((t: any) => t.type === 'milestone-release' && t.taskId === 't1')).toBe(true);
    });

    it('works out the side of an audit offer from the caller', async () => {
      const task = await post('client', '/tasks', {
        title: 'audited', description: 'Project details', category: 'Web Development', budget: 1000,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 100,
      });
      const ar = (await get('expert', `/audit-requests?taskId=${task.body.data.id}`)).body.data[0];
      const offer = await post('expert', `/audit-requests/${ar.id}/offers`, { amount: 9000, offeredBy: 'client' });
      const mine = offer.body.data.offers.at(-1);
      expect(mine.offeredBy).toBe('expert');
      expect((await post('expert', `/audit-requests/${ar.id}/offers/${mine.id}/accept`)).status).toBe(400);
      expect((await post('priya', `/audit-requests/${ar.id}/offers`, { amount: 1 })).status).toBe(403);
      // A reviewer cannot write themselves onto the engagement.
      await patch('priya', `/audit-requests/${ar.id}`, { expertId: 'u9' });
      expect((await get('client', `/audit-requests/${ar.id}`)).body.data.expertId).toBe('u3');
    });

    it('keeps notifications and messages between people who share a project', async () => {
      // Nobody writes another person's notifications any more — the platform does.
      expect((await post('worker', '/notifications', { userId: 'u1', type: 'payment', text: 'phish' })).status).toBe(404);
      const bobs = (await get('bob', '/notifications?userId=u1')).body.data;
      expect(bobs.every((n: any) => n.userId === 'u8')).toBe(true);
      expect((await post('worker', '/messages', { taskId: 't1', senderId: 'u1', receiverId: 'u5', content: 'hi' })).status).toBe(403);
    });

    it('reports draft projects in the revenue summary', async () => {
      await post('client', '/tasks', {
        title: 'Draft d', description: 'Project details', category: 'Web Development', budget: 100,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 50,
      });
      expect((await get('revenue', '/revenue/summary')).body.data.draftProjects).toBe(1);
    });

    it('applies a fee update completely or not at all', async () => {
      const res = await patch('revenue', '/revenue/fee-config', { depositPercent: 9, workerServicePercents: [20, 10, 500] });
      expect(res.status).toBe(400);
      expect((await get('revenue', '/revenue/fee-config')).body.data.deposit.percent).toBe(2.9);
    });

    it('does not reveal which emails are registered', async () => {
      const a = await login({ email: 'nobody@gmail.com', password: 'x' });
      const b = await login({ email: 'client@gmail.com', password: 'wrong' });
      expect(a.body.message).toBe(b.body.message);
    });
  });

  describe('still works', () => {
    it('runs a project from posting to payout', async () => {
      const task = (await post('bob', '/tasks', { title: 'Landing page', description: 'Project details', category: 'Web Development', budget: 600 })).body.data;
      const ms = (await post('bob', '/milestones', { taskId: task.id, title: 'Build it', budget: 600 })).body.data;
      const hire = await take('worker', task.id);
      expect(hire.status).toBe(201);
      expect((await get('bob', `/tasks/${task.id}`)).body.data).toMatchObject({ workerId: 'u2', status: 'in-progress' });

      expect((await patch('worker', `/milestones/${ms.id}`, { status: 'in-progress', progress: 50 })).status).toBe(200);
      expect((await post('worker', `/milestones/${ms.id}/submit`, { deliverable: { title: 'Done', link: 'https://github.com/example/work' } })).status).toBe(201);

      const before = await balance('u2');
      const approve = await post('bob', `/milestones/${ms.id}/approve`);
      expect(approve.status).toBe(201);
      expect(approve.body.data.release.net).toBeGreaterThan(0);
      expect(await balance('u2')).toBeGreaterThan(before);
      expect((await get('bob', `/tasks/${task.id}`)).body.data).toMatchObject({ status: 'completed', progress: 100 });
    });

    it('lets a client request changes and the worker pick it back up', async () => {
      expect((await patch('client', '/milestones/m6', { status: 'revision-needed', revisionNote: 'Match the spacing in the design file.' })).status).toBe(200);
      expect((await patch('worker', '/milestones/m6', {})).status).toBe(403);
    });

    it('lets a client invite a worker, who accepts and starts straight away', async () => {
      const inv = await post('client', '/proposals', { taskId: 't3', workerId: 'u2', message: 'Interested?' });
      expect(inv.body.data.type).toBe('invitation');
      expect((await post('worker', `/proposals/${inv.body.data.id}/accept`)).status).toBe(201);
      expect((await get('client', '/tasks/t3')).body.data).toMatchObject({ workerId: 'u2', status: 'in-progress' });
      // The pending applications on t3 close, and can no longer be accepted.
      expect((await get('client', '/proposals?taskId=t3')).body.data.find((p: any) => p.id === 'p1').status).toBe('closed');
      expect((await post('client', '/proposals/p1/accept')).status).toBe(400);
      expect((await get('client', '/notifications')).body.data.some((n: any) => n.type === 'hire' && n.link === '/project-milestone-board?id=t3')).toBe(true);
    });

    it('does not let a client invite a worker who already applied, or a worker apply when invited', async () => {
      expect((await post('client', '/proposals', { taskId: 't3', workerId: 'u5' })).status).toBe(400);
      expect((await post('worker', '/proposals', { taskId: 't5' })).status).toBe(400); // Alex is invited to t5
    });

    it('lets a worker decline an invitation, after which they are not invited again', async () => {
      expect((await post('worker', '/proposals/p3/decline')).status).toBe(201);
      expect((await get('bob', '/proposals?taskId=t5')).body.data.find((p: any) => p.id === 'p3').status).toBe('declined');
      expect((await post('bob', '/proposals', { taskId: 't5', workerId: 'u2' })).status).toBe(400);
      // Declining an invitation does not stop the worker applying later.
      expect((await take('worker', 't5')).status).toBe(201);
    });

    it('lets whoever sent one withdraw it, and nobody else', async () => {
      expect((await patch('worker', '/proposals/p3', { status: 'withdrawn' })).status).toBe(403);
      expect((await patch('bob', '/proposals/p3', { status: 'rejected' })).status).toBe(400);
      expect((await patch('bob', '/proposals/p3', { status: 'withdrawn' })).status).toBe(200);
      expect((await post('worker', '/proposals/p3/accept')).status).toBe(400);

      expect((await patch('client', '/proposals/p2', { status: 'withdrawn' })).status).toBe(403);
      expect((await patch('michael', '/proposals/p2', { status: 'withdrawn' })).status).toBe(200);
      expect((await post('client', '/proposals/p2/accept')).status).toBe(400);
      // A withdrawn application can be sent again, up to three in all.
      expect((await post('michael', '/proposals', { taskId: 't3' })).status).toBe(201);
    });

    it('lets a client reject an application for good', async () => {
      expect((await post('client', '/proposals/p1/decline')).status).toBe(201);
      expect((await get('sarah', '/proposals')).body.data.find((p: any) => p.id === 'p1').status).toBe('rejected');
      expect((await post('sarah', '/proposals', { taskId: 't3' })).status).toBe(400);
      expect((await get('sarah', '/notifications')).body.data.some((n: any) => n.link === '/my-proposals')).toBe(true);
    });

    it('lets a client delete an open project and returns its budget exactly', async () => {
      const before = await balance('u1');
      const task = (await post('client', '/tasks', { title: 'tmp', description: 'Project details', category: 'Web Development', budget: 1000 })).body.data;
      expect(await balance('u1')).toBe(before - 1000);
      expect((await del('client', `/tasks/${task.id}`)).status).toBe(200);
      expect(await balance('u1')).toBe(before);
    });

    it('refuses to post a project the client cannot pay for', async () => {
      const res = await post('client', '/tasks', { title: 'Too big', description: 'Project details', category: 'Web Development', budget: 10_000_000 });
      expect(res.status).toBe(400);
      expect((await get('client', '/tasks')).body.data.some((t: any) => t.title === 'Too big')).toBe(false);
    });

    it('holds the budget at posting, charges fees at hire and leaves nothing in escrow at the end', async () => {
      const start = await balance('u8');
      const task = (await post('bob', '/tasks', { title: 'Full cycle', description: 'Project details', category: 'Web Development', budget: 1000 })).body.data;
      expect(await balance('u8')).toBe(start - 1000);
      expect((await get('bob', `/ledger/escrow/${task.id}`)).body.data.projectHeld).toBe(1000);

      const ms = (await post('bob', '/milestones', { taskId: task.id, title: 'All of it', budget: 1000 })).body.data;
      expect((await take('worker', task.id)).status).toBe(201);
      // Accepting charged the fees on the posted budget (5% + $4.99); the budget stays in escrow.
      expect(await balance('u8')).toBe(Math.round((start - 1000 - 50 - 4.99) * 100) / 100);
      expect((await get('bob', `/tasks/${task.id}`)).body.data).toMatchObject({ budget: 1000, contractPrice: 1000 });

      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: { title: 'Done', link: 'https://github.com/example/work' } });
      expect((await post('bob', `/milestones/${ms.id}/approve`)).status).toBe(201);
      expect((await get('bob', `/tasks/${task.id}`)).body.data.status).toBe('completed');
      expect((await get('bob', `/ledger/escrow/${task.id}`)).body.data).toMatchObject({ projectHeld: 0, auditHeld: 0, disputeHeld: 0 });
      expect(await balance('u8')).toBe(Math.round((start - 1000 - 54.99) * 100) / 100);
    });

    it('charges a cancellation fee by how long a project was live, and refunds reviewer escrow in full', async () => {
      // t3 was posted weeks ago, so the late rate (5% of $1,200) applies.
      const quote = (await get('client', '/tasks/t3/cancellation-quote')).body.data;
      expect(quote).toMatchObject({ cancellable: true, rate: 5, base: 1200, fee: 60 });
      const before = await balance('u1');
      expect((await patch('client', '/tasks/t3', { status: 'cancelled' })).status).toBe(200);
      expect(await balance('u1')).toBe(before + 1140);
      expect((await get('client', '/ledger/escrow/t3')).body.data.projectHeld).toBe(0);
      expect((await get('revenue', '/revenue/project/t3')).body.data.platformEarnings.cancellationFee).toBe(60);

      // A project cancelled within its first day costs nothing, audit fee included.
      const start = await balance('u1');
      const fresh = (await post('client', '/tasks', {
        title: 'Changed my mind', description: 'Project details', category: 'Web Development', budget: 500,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 100,
      })).body.data;
      const ar = (await get('expert', `/audit-requests?taskId=${fresh.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      expect((await get('client', `/tasks/${fresh.id}`)).body.data.status).toBe('open');
      expect((await get('client', `/tasks/${fresh.id}/cancellation-quote`)).body.data).toMatchObject({ fee: 0, refund: { audit: 100 } });
      expect((await patch('client', `/tasks/${fresh.id}`, { status: 'cancelled' })).status).toBe(200);
      expect(await balance('u1')).toBe(start);
    });

    it('does not let a client cancel or delete once a worker is hired', async () => {
      expect((await get('client', '/tasks/t1/cancellation-quote')).body.data.cancellable).toBe(false);
      expect((await patch('client', '/tasks/t1', { status: 'cancelled' })).status).toBe(400);
      expect((await del('client', '/tasks/t1')).status).toBe(403);
    });

    it('charges the same fee when a live project is deleted instead of cancelled', async () => {
      const before = await balance('u1');
      expect((await del('client', '/tasks/t3')).status).toBe(200);
      expect(await balance('u1')).toBe(before + 1140);
    });

    it("does not let a superuser move money in or out of someone else's wallet", async () => {
      const before = await balance('u1');
      expect((await post('super', '/users/u1/wallet/add', { amount: 1000 })).status).toBe(403);
      expect((await post('super', '/users/u1/wallet/withdraw', { amount: 100 })).status).toBe(403);
      expect(await balance('u1')).toBe(before);
    });

    it('keeps operations accounts and expert onboarding out of the staff shortcuts', async () => {
      const expert = await post('super', '/users/staff', { name: 'Shortcut Expert', email: 'shortcut@x.com', password: 'Password@123', role: 'expert' });
      expect(expert.status).toBe(400);
      // A second superuser could never be removed again, so none can be made.
      const other = await post('super', '/users/staff', { name: 'Second Super', email: 'second@x.com', password: 'Password@123', role: 'superuser' });
      expect(other.status).toBe(403);
      expect((await del('super', '/users/u4')).status).toBe(403);
    });

    it('serves live, anonymous platform figures to the landing pages', async () => {
      const res = await api().get('/api/stats/public');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ workers: 4, projectsCompleted: 0 });
      expect(JSON.stringify(res.body.data)).not.toMatch(/@gmail\.com|walletBalance|password/);
    });

    it("does not let a client cut a hired worker's milestone pay", async () => {
      // t1 has Sarah hired; m4 is $200 and pending.
      expect((await patch('client', '/milestones/m4', { budget: 1 })).status).toBe(400);
      expect((await get('client', '/milestones/m4')).body.data.budget).toBe(200);
    });

    it('does not let a superuser approve work or file a report that pays someone', async () => {
      await submitM4();
      expect((await post('super', '/milestones/m4/approve')).status).toBe(403);
      expect((await patch('super', '/milestones/m4', { budget: 1 })).status).toBe(403);
      expect((await post('super', '/audit-reports', { auditRequestId: 'ar1', milestoneId: 'm6', verdict: 'pass' })).status).toBe(403);
    });

    it('does not let a superuser post a project for a client', async () => {
      const res = await post('super', '/tasks', { title: 'On behalf', description: 'Project details', category: 'Web Development', budget: 100, clientId: 'u1' });
      expect(res.status).toBe(403);
    });

    it('refuses to approve work that was never submitted', async () => {
      expect((await post('client', '/milestones/m4/approve')).status).toBe(400);
    });

    it('pays the dispute reviewer from dispute escrow when they give the verdict', async () => {
      // The client raises the dispute, so the client pays its reviewer.
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'Scope mismatch', details: 'More pages were requested.', outcome: 'Release payment', expertId: 'u3', reviewerFee: 120 })).body.data;
      expect(d).toMatchObject({ details: 'More pages were requested.', outcome: 'Release payment', payerId: 'u1' });
      const clientBefore = await balance('u1');
      await engageReviewer('client', 'expert', d.auditRequestId);
      expect(await balance('u1')).toBe(clientBefore - 120);
      expect((await get('client', '/ledger/escrow/t1')).body.data.disputeHeld).toBe(120);

      const expertBefore = await balance('u3');
      const r = await post('expert', `/disputes/${d.id}/resolve`, { verdict: 'worker-favour', resolution: 'Work matches the brief.' });
      expect(r.status).toBe(201);
      expect(await balance('u3')).toBe(expertBefore + 108); // 120 less 10% commission
      expect((await get('sarah', '/ledger/escrow/t1')).body.data.disputeHeld).toBe(0);

      const breakdown = (await get('revenue', '/revenue/project/t1')).body.data;
      expect(breakdown.clientPaid.intoDisputeEscrow).toBe(120);
      expect(breakdown.reviewerDispute.grossFees).toBe(120);
      expect(breakdown.clientPaid.intoAuditEscrow).toBe(0);
    });

    it('sends the milestone back to the worker when the client wins, without moving money', async () => {
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).body.data;
      await engageReviewer('client', 'expert', d.auditRequestId);
      const held = (await get('client', '/ledger/escrow/t1')).body.data.projectHeld;
      const clientBefore = await balance('u1');
      await post('expert', `/disputes/${d.id}/resolve`, { verdict: 'client-favour', resolution: 'Fix the padding on mobile.' });
      expect((await get('client', '/milestones/m4')).body.data).toMatchObject({ status: 'revision-needed', revisionNote: 'Fix the padding on mobile.' });
      expect((await get('client', '/ledger/escrow/t1')).body.data.projectHeld).toBe(held);
      expect(await balance('u1')).toBe(clientBefore);
      // The worker reworks it and the client can then approve it as usual.
      expect((await post('sarah', '/milestones/m4/submit', { deliverable: { title: 'v2', link: 'https://github.com/example/work' } })).status).toBe(201);
      expect((await post('client', '/milestones/m4/approve')).status).toBe(201);
    });

    it('accepts only the worker-favour and client-favour verdicts', async () => {
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).body.data;
      await engageReviewer('client', 'expert', d.auditRequestId);
      for (const verdict of ['split', 'revision']) {
        expect((await post('expert', `/disputes/${d.id}/resolve`, { verdict, resolution: 'The reviewer explains the verdict here.' })).status).toBe(400);
      }
    });

    it('lets operations settle a stuck dispute and returns the reviewer fee', async () => {
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).body.data;
      await engageReviewer('client', 'expert', d.auditRequestId);
      const before = await balance('u1');
      expect((await post('super', `/disputes/${d.id}/resolve`, { verdict: 'worker-favour', resolution: 'Operations override.' })).status).toBe(201);
      expect(await balance('u1')).toBe(before + 100); // the reviewer fee comes back
      expect((await get('client', '/ledger/escrow/t1')).body.data.disputeHeld).toBe(0);
    });

    it('lets the payer choose another reviewer after a decline', async () => {
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).body.data;
      await post('expert', `/audit-requests/${d.auditRequestId}/decline`, { reason: 'busy' });
      const next = await post('client', `/audit-requests/${d.auditRequestId}/reassign`, { expertId: 'u9', openingOffer: 90 });
      expect(next.status).toBe(201);
      expect((await get('priya', `/audit-requests/${next.body.data.id}`)).status).toBe(200);
      expect((await get('client', `/disputes/${d.id}`)).body.data.expertId).toBe('u9');
    });

    it('runs an audit engagement from offer to a live project', async () => {
      const task = (await post('client', '/tasks', {
        title: 'Audited', description: 'Project details', category: 'UI/UX Design', budget: 1000,
        auditEnabled: true, auditExpertId: 'u9', auditFee: 100,
      })).body.data;
      expect(task.status).toBe('draft');
      const ar = (await get('priya', `/audit-requests?taskId=${task.id}`)).body.data[0];
      const counter = (await post('priya', `/audit-requests/${ar.id}/offers`, { amount: 150 })).body.data.offers.at(-1);
      expect((await post('client', `/audit-requests/${ar.id}/offers/${counter.id}/accept`)).status).toBe(201);
      expect((await post('client', `/audit-requests/${ar.id}/fund`)).status).toBe(201);
      expect((await post('priya', `/audit-requests/${ar.id}/accept`, {})).status).toBe(201);
      expect((await get('client', `/tasks/${task.id}`)).body.data.status).toBe('open');
    });

    it('refunds a funded audit when the reviewer declines', async () => {
      const task = (await post('client', '/tasks', {
        title: 'Audited', description: 'Project details', category: 'UI/UX Design', budget: 1000,
        auditEnabled: true, auditExpertId: 'u9', auditFee: 100,
      })).body.data;
      const ar = (await get('priya', `/audit-requests?taskId=${task.id}`)).body.data[0];
      const opening = ar.offers[0];
      await post('priya', `/audit-requests/${ar.id}/offers/${opening.id}/accept`);
      await post('client', `/audit-requests/${ar.id}/fund`);
      const before = await balance('u1');
      expect((await post('priya', `/audit-requests/${ar.id}/decline`, { reason: 'busy' })).status).toBe(201);
      expect(await balance('u1')).toBe(before + 100);
    });

    it('approves an expert application into a reviewer clients can pick', async () => {
      const app_ = await api().post('/api/expert-applications').send({
        name: 'New Reviewer', email: 'new.rev@gmail.com', password: 'Reviewer@123', expertise: 'Mobile Development',
      });
      expect(app_.status).toBe(201);
      expect((await patch('intake', `/expert-applications/${app_.body.data.id}/status`, { status: 'approved' })).status).toBe(200);
      const signedIn = await login({ email: 'new.rev@gmail.com', password: 'Reviewer@123' });
      expect(signedIn.status).toBe(201);
      expect(signedIn.body.data.user.domains).toContain('Mobile Development');
    });

    it('runs the reported scenario: budget 500, audit 300, dispute 1200 — every fee in escrow, nothing left at the end', async () => {
      const start = await balance('u1');
      const task = (await post('client', '/tasks', {
        title: 'Reported scenario', description: 'Project details', category: 'Web Development', budget: 500,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 300,
      })).body.data;
      // The project budget is deducted at posting and held.
      expect(await balance('u1')).toBe(start - 500);
      const ms = (await post('client', '/milestones', { taskId: task.id, title: 'Only milestone', budget: 500 })).body.data;

      // Audit fee: agreed, funded into AUDIT escrow, accepted.
      const ar = (await get('expert', `/audit-requests?taskId=${task.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      expect(await balance('u1')).toBe(start - 800);
      let held = (await get('client', `/ledger/escrow/${task.id}`)).body.data;
      expect(held).toMatchObject({ projectHeld: 500, auditHeld: 300, disputeHeld: 0 });

      // Hire: only the contract fees are charged now.
      expect((await take('worker', task.id)).status).toBe(201);
      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });

      // The client disputes it and offers the reviewer 1200 — funded into DISPUTE escrow.
      const d = (await post('client', '/disputes', { taskId: task.id, milestoneId: ms.id, reason: 'Incomplete work', expertId: 'u3', reviewerFee: 1200 })).body.data;
      await engageReviewer('client', 'expert', d.auditRequestId);
      held = (await get('client', `/ledger/escrow/${task.id}`)).body.data;
      expect(held).toMatchObject({ projectHeld: 500, auditHeld: 300, disputeHeld: 1200 });

      // The reviewer files the milestone audit (releasing the audit fee), then
      // the verdict pays the worker and the reviewer's dispute fee.
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: ms.id, verdict: 'pass', findings: FINDINGS })).status).toBe(201);
      expect((await post('expert', `/disputes/${d.id}/resolve`, { verdict: 'worker-favour', resolution: 'Meets the brief in every respect.' })).status).toBe(201);

      expect((await get('client', `/tasks/${task.id}`)).body.data.status).toBe('completed');
      expect((await get('client', `/ledger/escrow/${task.id}`)).body.data).toMatchObject({ projectHeld: 0, auditHeld: 0, disputeHeld: 0 });

      const b = (await get('revenue', `/revenue/project/${task.id}`)).body.data;
      expect(b.clientPaid.intoAuditEscrow).toBe(300);
      expect(b.clientPaid.intoDisputeEscrow).toBe(1200);
      expect(b.reviewerAudit.grossFees).toBe(300);
      expect(b.reviewerDispute.grossFees).toBe(1200);
      expect(b.stillHeld.total).toBe(0);
    });

    it('pays the reviewer per milestone, including one the client approves before the report is due', async () => {
      const start = await balance('u1');
      const task = (await post('client', '/tasks', {
        title: 'Partly audited', description: 'Project details', category: 'Web Development', budget: 1000,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 400,
      })).body.data;
      const m1 = (await post('client', '/milestones', { taskId: task.id, title: 'One', budget: 500 })).body.data;
      const m2 = (await post('client', '/milestones', { taskId: task.id, title: 'Two', budget: 500 })).body.data;
      const ar = (await get('expert', `/audit-requests?taskId=${task.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      await take('worker', task.id);
      for (const m of [m1, m2]) await post('worker', `/milestones/${m.id}/submit`, { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });

      // A report pays that milestone's share straight away: half of 400, less 10%.
      const expertBefore = await balance('u3');
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: m1.id, verdict: 'pass', findings: FINDINGS })).status).toBe(201);
      expect(await balance('u3')).toBe(expertBefore + 180);
      // The client approves m2 inside the 5-day window without waiting: the reviewer is still paid.
      for (const m of [m1, m2]) expect((await post('client', `/milestones/${m.id}/approve`)).status).toBe(201);
      expect(await balance('u3')).toBe(expertBefore + 360);

      expect((await get('client', `/ledger/escrow/${task.id}`)).body.data).toMatchObject({ projectHeld: 0, auditHeld: 0, disputeHeld: 0 });
      expect(await balance('u1')).toBe(Math.round((start - 1000 - 400 - 50 - 4.99) * 100) / 100);
      // The project is over, so the audit is closed — and a refused report changes nothing.
      const late = await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: m1.id, verdict: 'fail', findings: 'Rewritten after the audit closed. ' + FINDINGS });
      expect(late.status).toBe(400);
      const reports = (await get('client', `/audit-reports?taskId=${task.id}`)).body.data;
      expect(reports.find((r: any) => r.milestoneId === m1.id).verdict).toBe('pass');
    });

    it("returns a milestone's audit share when the client approves it after the 5-day window with no report", async () => {
      const start = await balance('u1');
      const task = (await post('client', '/tasks', {
        title: 'Slow reviewer', description: 'Project details', category: 'Web Development', budget: 1000,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 400,
      })).body.data;
      const m1 = (await post('client', '/milestones', { taskId: task.id, title: 'One', budget: 500 })).body.data;
      const m2 = (await post('client', '/milestones', { taskId: task.id, title: 'Two', budget: 500 })).body.data;
      const ar = (await get('expert', `/audit-requests?taskId=${task.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      await take('worker', task.id);
      for (const m of [m1, m2]) await post('worker', `/milestones/${m.id}/submit`, { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });
      // Six days pass on m1 with no report.
      milestones().systemUpdate(m1.id, { submittedAt: new Date(Date.now() - 6 * DAY).toISOString() });
      const expertBefore = await balance('u3');
      expect((await post('client', `/milestones/${m1.id}/approve`)).status).toBe(201);
      expect(await balance('u3')).toBe(expertBefore); // nothing for m1
      expect((await get('client', `/ledger/escrow/${task.id}`)).body.data.auditHeld).toBe(200); // m1's share went back
      // The window closed, so a late report on m1 is refused; m2 is still open to report.
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: m1.id, verdict: 'pass', findings: FINDINGS })).status).toBe(400);
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: m2.id, verdict: 'pass', findings: FINDINGS })).status).toBe(201);
      expect(await balance('u3')).toBe(expertBefore + 180);
      await post('client', `/milestones/${m2.id}/approve`);
      expect((await get('client', `/ledger/escrow/${task.id}`)).body.data).toMatchObject({ projectHeld: 0, auditHeld: 0 });
      expect(await balance('u1')).toBe(Math.round((start - 1000 - 400 - 50 - 4.99 + 200) * 100) / 100);
    });

    it('refuses an audit report with no verdict or findings', async () => {
      const task = (await post('client', '/tasks', {
        title: 'Empty report', description: 'Project details', category: 'Web Development', budget: 600,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 100,
      })).body.data;
      const ms = (await post('client', '/milestones', { taskId: task.id, title: 'Only', budget: 600 })).body.data;
      const ar = (await get('expert', `/audit-requests?taskId=${task.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      await take('worker', task.id);
      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: ms.id })).status).toBe(400);
      expect((await post('expert', '/audit-reports', { auditRequestId: ar.id, milestoneId: ms.id, verdict: 'pass', findings: 'ok' })).status).toBe(400);
    });

    it('refuses to hire on a project with no milestones', async () => {
      const task = (await post('client', '/tasks', { title: 'Empty', description: 'Project details', category: 'Web Development', budget: 300 })).body.data;
      expect((await take('worker', task.id)).status).toBe(400);
      expect((await get('client', `/tasks/${task.id}`)).body.data).toMatchObject({ workerId: null, status: 'open' });
    });

    it('names an audit report after the real project, milestone and worker', async () => {
      const task = (await post('client', '/tasks', {
        title: 'Named audit', description: 'Project details', category: 'Web Development', budget: 600,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 100,
      })).body.data;
      const ms = (await post('client', '/milestones', { taskId: task.id, title: 'Only', budget: 600 })).body.data;
      const ar = (await get('expert', `/audit-requests?taskId=${task.id}`)).body.data[0];
      await engageReviewer('client', 'expert', ar.id);
      await take('worker', task.id);
      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: { title: 'v1', link: 'https://github.com/example/work' } });
      const report = (await post('expert', '/audit-reports', {
        auditRequestId: ar.id, milestoneId: ms.id, verdict: 'pass', findings: FINDINGS,
        projectTitle: 'Somebody else', milestoneTitle: 'Made up', workerName: 'Nobody',
      })).body.data;
      expect(report).toMatchObject({ projectTitle: 'Named audit', milestoneTitle: 'Only', workerName: 'Alex Worker' });
    });

    it('cancels a draft project for good and returns its money', async () => {
      const start = await balance('u1');
      const task = (await post('client', '/tasks', {
        title: 'Abandoned draft', description: 'Project details', category: 'Web Development', budget: 700,
        auditEnabled: true, auditExpertId: 'u3', auditFee: 100,
      })).body.data;
      expect(task.status).toBe('draft');
      expect((await post('client', `/tasks/${task.id}/cancel-draft`)).status).toBe(201);
      expect((await get('client', `/tasks/${task.id}`)).body.data.status).toBe('cancelled');
      expect(await balance('u1')).toBe(start);
    });

    it('refuses to delete a user who still has projects or money', async () => {
      expect((await del('super', '/users/u1')).status).toBe(400);
    });

    it('saves every profile field the settings pages send, and changes a password', async () => {
      const res = await patch('worker', '/users/u2', {
        phone: '+919876543210', bio: 'Builds things.', jobTitle: 'React Developer', experienceLevel: 'Senior',
        hourlyRate: 70, availability: 'Part-time', languages: ['English'],
        portfolioProjects: [{ id: 'p1', title: 'Shop', url: 'https://example.com' }],
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ phone: '+919876543210', bio: 'Builds things.', jobTitle: 'React Developer', hourlyRate: 70, availability: 'Part-time' });
      const exp = await patch('expert', '/users/u3', { domains: ['Security'], availability: { status: 'Busy', maxCases: 1, type: 'Audits only' } });
      expect(exp.body.data.domains).toEqual(['Security']);

      expect((await post('worker', '/users/u2/password', { currentPassword: 'wrong', newPassword: 'Another1pass!' })).status).toBe(400);
      expect((await post('worker', '/users/u2/password', { currentPassword: 'Password@123', newPassword: 'Another1pass!' })).status).toBe(201);
      expect((await login({ email: 'worker@gmail.com', password: 'Another1pass!' })).status).toBe(201);
    });

    it('notifies the worker when their application is accepted', async () => {
      expect((await post('client', '/proposals/p1/accept')).status).toBe(201);
      const notes = (await get('sarah', '/notifications')).body.data;
      expect(notes.some((n: any) => n.type === 'hire' && n.link === '/worker-milestone-board?id=t3')).toBe(true);
    });

    it('lets the intake desk open an applicant résumé', async () => {
      const up = await api().post('/api/files/application').attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'cv.pdf', contentType: 'application/pdf' });
      expect(up.status).toBe(201);
      expect((await get('intake', `/files/${up.body.data.id}/meta`)).status).toBe(200);
      expect((await get('worker', `/files/${up.body.data.id}/meta`)).status).toBe(403);
    });

    it("opens a dispute's fee negotiation with the client's proposed fee", async () => {
      await submitM4();
      const d = await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 150 });
      expect(d.status).toBe(201);
      const pv = await get('expert', `/audit-requests/${d.body.data.auditRequestId}/preview`);
      expect(pv.body.data.kind).toBe('dispute-audit');
      expect(pv.body.data.offers).toEqual([expect.objectContaining({ offeredBy: 'client', amount: 150, status: 'pending' })]);
      // The reviewer can accept it, and the client can then fund it.
      const offerId = pv.body.data.offers[0].id;
      expect((await post('expert', `/audit-requests/${d.body.data.auditRequestId}/offers/${offerId}/accept`)).status).toBe(201);
      expect((await post('client', `/audit-requests/${d.body.data.auditRequestId}/fund`)).status).toBe(201);
    });

    it('delivers messages and notifications within a project', async () => {
      expect((await post('client', '/messages', { taskId: 't1', senderId: 'u1', receiverId: 'u5', content: 'hello' })).status).toBe(201);
      expect((await get('sarah', '/messages?taskId=t1')).body.data).toHaveLength(1);
      // The message itself notifies the receiver.
      expect((await get('sarah', '/notifications')).body.data.some((n: any) => n.type === 'message')).toBe(true);
    });
  });

  describe('round 4 — loopholes closed', () => {
    const DELIV = { title: 'v1', link: 'https://github.com/example/work' };

    it('has no route for an operator to set someone else\'s password', async () => {
      expect((await post('super', '/users/u8/password-reset', { newPassword: 'Hijack3d!x' })).status).toBe(404);
    });

    it('ends every other session when a password changes', async () => {
      const first = (await login({ email: 'emily@gmail.com', password: 'Password@123' })).body.data.token;
      const second = (await login({ email: 'emily@gmail.com', password: 'Password@123' })).body.data.token;
      const changed = await api().post('/api/users/u7/password').set('Authorization', `Bearer ${first}`)
        .send({ currentPassword: 'Password@123', newPassword: 'Brand1New!pw' });
      expect(changed.status).toBe(201);
      // The session that changed it carries on with the token it was handed back.
      expect((await api().get('/api/users/u7').set('Authorization', `Bearer ${changed.body.data.token}`)).status).toBe(200);
      expect((await api().get('/api/users/u7').set('Authorization', `Bearer ${second}`)).status).toBe(401);
      expect((await api().get('/api/users/u7').set('Authorization', `Bearer ${first}`)).status).toBe(401);
    });

    it('makes a staff account created by the superuser choose its own password first, and records who made it', async () => {
      const made = await post('super', '/users/staff', { name: 'New Revenue', email: 'newrev@x.com', password: 'Temp0rary!pw', role: 'revenue-admin' });
      expect(made.status).toBe(201);
      expect(made.body.data).toMatchObject({ createdBy: 'u4', mustChangePassword: true });
      const signIn = await login({ email: 'newrev@x.com', password: 'Temp0rary!pw' });
      expect(signIn.body.data.session.mustChangePassword).toBe(true);
      const tmp = signIn.body.data.token;
      const id = made.body.data.id;
      // Until the owner picks a password, the account can do nothing else.
      expect((await api().get('/api/revenue/summary').set('Authorization', `Bearer ${tmp}`)).status).toBe(403);
      const changed = await api().post(`/api/users/${id}/password`).set('Authorization', `Bearer ${tmp}`)
        .send({ currentPassword: 'Temp0rary!pw', newPassword: 'Mine4ever!pw' });
      expect(changed.status).toBe(201);
      expect((await api().get('/api/revenue/summary').set('Authorization', `Bearer ${changed.body.data.token}`)).status).toBe(200);
      // The creator's password no longer works.
      expect((await login({ email: 'newrev@x.com', password: 'Temp0rary!pw' })).status).toBe(400);
      const compliance = (await login({ email: 'compliance@gmail.com', password: 'Compliance@123' })).body.data.token;
      const trail = await api().get('/api/audit-log?kind=account.create').set('Authorization', `Bearer ${compliance}`);
      expect(trail.body.data.events.some((e: any) => e.detail?.createdBy === 'u4' && e.detail?.userId === id)).toBe(true);
    });

    it('does not accept a bcrypt hash as a password', async () => {
      const hash = '$2b$10$' + 'a'.repeat(53);
      const res = await api().post('/api/users').send({ name: 'Weak Pw', email: 'weak@x.com', password: hash, role: 'worker' });
      expect(res.status).toBe(400);
    });

    it('does not let a reviewer add review domains intake never approved', async () => {
      expect((await patch('expert', '/users/u3', { domains: ['Mobile Development'] })).status).toBe(400);
      expect((await patch('expert', '/users/u3', { domains: ['Security'] })).status).toBe(200);
    });

    it('tells an applicant their status only when they sign in with their own password', async () => {
      // The public lookup is gone; the path now needs a signed-in intake desk.
      expect((await api().get('/api/expert-applications/status?email=expert@gmail.com')).status).toBe(401);
      await api().post('/api/expert-applications').send({ name: 'Pending Person', email: 'pending@x.com', password: 'Pending1!pw', expertise: 'Mobile Development' });
      const right = await login({ email: 'pending@x.com', password: 'Pending1!pw' });
      expect(right.status).toBe(403);
      expect(right.body.message).toMatch(/under review/);
      const wrong = await login({ email: 'pending@x.com', password: 'Wrong1!pw' });
      expect(wrong.body.message).toBe('Incorrect email or password.');
    });

    it('refuses an application whose expertise covers no category', async () => {
      const res = await api().post('/api/expert-applications').send({ name: 'Vague Person', email: 'vague@x.com', password: 'Vague1!pw', expertise: 'Everything' });
      expect(res.status).toBe(400);
    });

    it('validates projects, money and dates', async () => {
      const base = { title: 'Valid title', description: 'Project details', category: 'Web Development', budget: 100 };
      expect((await post('client', '/tasks', { ...base, title: '' })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, category: 'Not A Category' })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, budget: 1.001 })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, deadline: '2020-01-01' })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, deadline: 'yesterday-ish' })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, currency: 'EUR' })).status).toBe(400);
      expect((await post('client', '/tasks', { ...base, currency: 'USD' })).status).toBe(400);
      expect((await post('client', '/users/u1/wallet/add', { amount: 1e20 })).status).toBe(400);
      expect((await post('client', '/users/u1/wallet/add', { amount: 10.555 })).status).toBe(400);
    });

    it('posts a project with its milestones in one step, or not at all', async () => {
      const before = await balance('u1');
      const bad = await post('client', '/tasks', {
        title: 'Mismatched', description: 'Project details', category: 'Web Development', budget: 500,
        milestones: [{ title: 'Half', budget: 200 }],
      });
      expect(bad.status).toBe(400);
      expect(await balance('u1')).toBe(before);
      const good = await post('client', '/tasks', {
        title: 'Planned', description: 'Project details', category: 'Web Development', budget: 500,
        milestones: [{ title: 'First half', budget: 250 }, { title: 'Second half', budget: 250 }],
      });
      expect(good.status).toBe(201);
      expect((await get('client', `/milestones?taskId=${good.body.data.id}`)).body.data).toHaveLength(2);
    });

    it('lets a client remove a milestone before hiring, never after', async () => {
      expect((await del('client', '/milestones/m15')).status).toBe(200);
      expect((await del('client', '/milestones/m4')).status).toBe(400); // t1 has a worker
    });

    it('never lets a budget change after posting, and keeps escrow as posted', async () => {
      const before = await balance('u1');
      const res = await patch('client', '/tasks/t3', { budget: 2000 });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be changed after a project is posted/);
      expect((await patch('client', '/tasks/t3', { budget: 600 })).status).toBe(400);
      expect((await get('client', '/tasks/t3')).body.data.budget).toBe(1200);
      expect((await get('client', '/ledger/escrow/t3')).body.data.projectHeld).toBe(1200);
      expect(await balance('u1')).toBe(before);
      // Other fields still edit.
      expect((await patch('client', '/tasks/t3', { title: 'API Integration Project v2' })).status).toBe(200);
    });

    it('hires one applicant at the posted budget, once the plan matches it', async () => {
      const task = (await post('bob', '/tasks', { title: 'Applicants', description: 'Project details', category: 'Web Development', budget: 1000 })).body.data;
      const ms = (await post('bob', '/milestones', { taskId: task.id, title: 'Most of it', budget: 600 })).body.data;
      const a = (await post('worker', '/proposals', { taskId: task.id })).body.data;
      const b = (await post('sarah', '/proposals', { taskId: task.id })).body.data;
      // The plan is ₹400 short of the budget, so nobody can be hired yet.
      const refused = await post('bob', `/proposals/${a.id}/accept`);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toMatch(/₹600 of the ₹1000/);
      await patch('bob', `/milestones/${ms.id}`, { budget: 1000 });
      const before = await balance('u8');
      expect((await post('bob', `/proposals/${a.id}/accept`)).status).toBe(201);
      expect(await balance('u8')).toBe(Math.round((before - 50 - 4.99) * 100) / 100);
      expect((await get('bob', `/ledger/escrow/${task.id}`)).body.data.projectHeld).toBe(1000);
      // The other applicant is closed out.
      expect((await post('bob', `/proposals/${b.id}/accept`)).status).toBe(400);
      expect((await get('bob', `/tasks/${task.id}`)).body.data.workerId).toBe('u2');
      // An applicant cannot hire themselves.
      expect((await post('worker', `/proposals/${a.id}/accept`)).status).toBe(403);
    });

    it('starts nothing when the client cannot cover the contract fees', async () => {
      const task = (await post('bob', '/tasks', { title: 'Broke', description: 'Project details', category: 'Web Development', budget: 300 })).body.data;
      await post('bob', '/milestones', { taskId: task.id, title: 'All of it', budget: 300 });
      const inv = (await post('bob', '/proposals', { taskId: task.id, workerId: 'u2' })).body.data;
      const app = (await post('sarah', '/proposals', { taskId: task.id })).body.data;
      // Bob spends the rest of his wallet on another project.
      const rest = await balance('u8');
      expect((await post('bob', '/tasks', { title: 'Everything', description: 'Project details', category: 'Web Development', budget: rest })).status).toBe(201);
      // The invited worker is told the client cannot pay; the client is pointed at their wallet.
      const res = await post('worker', `/proposals/${inv.id}/accept`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/client cannot fund/);
      expect((await get('bob', '/notifications')).body.data.some((n: any) => n.link === '/client-wallet')).toBe(true);
      // The client accepting an application is refused for the same reason.
      expect((await post('bob', `/proposals/${app.id}/accept`)).status).toBe(400);
      expect((await get('bob', `/tasks/${task.id}`)).body.data.workerId).toBeNull();
    });

    it("closes a suspended worker's applications and invitations", async () => {
      await patch('super', '/users/u2', { status: 'suspended' });
      expect((await get('bob', '/proposals?taskId=t5')).body.data.find((p: any) => p.id === 'p3').status).toBe('closed');
      await patch('super', '/users/u2', { status: 'active' });
      expect((await post('worker', '/proposals/p3/accept')).status).toBe(400);
    });

    it('drops an invited worker from the project once someone else is hired: no files, no messages', async () => {
      const task = (await post('client', '/tasks', { title: 'Files test', description: 'Project details', category: 'Web Development', budget: 300 })).body.data;
      const ms = (await post('client', '/milestones', { taskId: task.id, title: 'All of it', budget: 300 })).body.data;
      await post('client', '/proposals', { taskId: task.id, workerId: 'u2' });
      await take('sarah', task.id);
      const up = await api().post('/api/files').set(as('sarah'))
        .field('taskId', task.id).field('milestoneId', ms.id).field('purpose', 'deliverable')
        .attach('file', Buffer.from('secret deliverable'), { filename: 'work.txt', contentType: 'text/plain' });
      expect(up.status).toBe(201);
      const fid = up.body.data.id;
      expect(fid).toMatch(/^f_[0-9a-f]{32}$/);
      // Not handed in yet: the client cannot open it either.
      expect((await get('client', `/files/${fid}/meta`)).status).toBe(403);
      await post('sarah', `/milestones/${ms.id}/submit`, { deliverable: { title: 'v1', files: [up.body.data] } });
      expect((await get('client', `/files/${fid}/meta`)).status).toBe(200);
      expect((await get('worker', `/files/${fid}/meta`)).status).toBe(403);
      expect((await post('worker', '/messages', { taskId: task.id, receiverId: 'u1', content: 'still here' })).status).toBe(403);
      // A submitted deliverable is the record of what was handed in.
      expect((await del('sarah', `/files/${fid}`)).status).toBe(400);
    });

    it('refuses a signed-in upload that belongs to no project', async () => {
      const up = await api().post('/api/files').set(as('worker'))
        .attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' });
      expect(up.status).toBe(400);
    });

    it('auto-approves a submission the client sits on for 7 days', async () => {
      await submitM4();
      const m4 = (await get('client', '/milestones/m4')).body.data;
      expect(new Date(m4.reviewDueAt).getTime() - Date.now()).toBeGreaterThan(6.9 * DAY);
      const before = await balance('u5');
      expect(milestones().autoApproveDue(Date.now() + 8 * DAY)).toContain('m4');
      expect((await get('client', '/milestones/m4')).body.data).toMatchObject({ status: 'completed', approvedHow: 'auto-approved' });
      expect(await balance('u5')).toBeGreaterThan(before);
      // Seed milestones submitted before these rules carry no clock and are left alone.
      expect((await get('client', '/milestones/m6')).body.data.status).toBe('submitted');
    });

    it('caps change requests at three', async () => {
      for (let i = 0; i < 3; i++) {
        await submitM4();
        expect((await patch('client', '/milestones/m4', { status: 'revision-needed', revisionNote: 'Please change this part.' })).status).toBe(200);
      }
      await submitM4();
      const fourth = await patch('client', '/milestones/m4', { status: 'revision-needed', revisionNote: 'Please change this part.' });
      expect(fourth.status).toBe(400);
      expect(fourth.body.message).toMatch(/dispute/);
    });

    it('lets the client withdraw a dispute the reviewer has not accepted, and expires a stalled one', async () => {
      await submitM4();
      const d = (await post('client', '/disputes', { taskId: 't1', milestoneId: 'm4', reason: 'r', expertId: 'u3', reviewerFee: 100 })).body.data;
      expect((await post('client', `/disputes/${d.id}/withdraw`)).status).toBe(201);
      expect((await get('client', '/milestones/m4')).body.data.status).toBe('submitted');
      expect((await post('client', '/milestones/m4/approve')).status).toBe(201);

      // t1's m3 is disputed in the seed; a new dispute elsewhere expires if the reviewer never acts.
      const task = (await post('bob', '/tasks', { title: 'Expiry', description: 'Project details', category: 'Web Development', budget: 300 })).body.data;
      const ms = (await post('bob', '/milestones', { taskId: task.id, title: 'All of it', budget: 300 })).body.data;
      await take('worker', task.id);
      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: DELIV });
      const d2 = (await post('bob', '/disputes', { taskId: task.id, milestoneId: ms.id, reason: 'r', expertId: 'u3', reviewerFee: 50 })).body.data;
      await engageReviewer('bob', 'expert', d2.auditRequestId);
      // Accepted: no longer withdrawable, but it expires a week later with no verdict.
      expect((await post('bob', `/disputes/${d2.id}/withdraw`)).status).toBe(400);
      const before = await balance('u8');
      expect(disputes().expireDue(Date.now() + 8 * DAY)).toContain(d2.id);
      expect(await balance('u8')).toBe(before + 50);
      expect((await get('bob', `/disputes/${d2.id}`)).body.data.status).toBe('expired');
      expect((await get('bob', `/milestones/${ms.id}`)).body.data.status).toBe('submitted');
    });

    it('lets a client withdraw an audit request the reviewer has not accepted', async () => {
      const ar = (await post('client', '/audit-requests', { taskId: 't3', expertId: 'u3', openingOffer: 80 })).body.data;
      await post('expert', `/audit-requests/${ar.id}/offers/${ar.offers[0].id}/accept`);
      const before = await balance('u1');
      await post('client', `/audit-requests/${ar.id}/fund`);
      expect(await balance('u1')).toBe(before - 80);
      expect((await post('client', `/audit-requests/${ar.id}/cancel`)).status).toBe(201);
      expect(await balance('u1')).toBe(before);
    });

    it('refuses to sell an audit on a finished or cancelled project', async () => {
      await patch('client', '/tasks/t3', { status: 'cancelled' });
      expect((await post('client', '/audit-requests', { taskId: 't3', expertId: 'u3', openingOffer: 75 })).status).toBe(400);
    });

    it('lets a client end a contract the worker stopped delivering on', async () => {
      // t6 (Bob, worked by Alex) is weeks past its deadline with nothing handed in.
      expect((await get('bob', '/tasks/t6/non-delivery')).body.data.eligible).toBe(true);
      const before = await balance('u8');
      const ended = await post('bob', '/tasks/t6/end-for-non-delivery');
      expect(ended.status).toBe(201);
      expect(await balance('u8')).toBe(before + 2200);
      expect((await get('bob', '/tasks/t6')).body.data).toMatchObject({ status: 'cancelled', endedReason: 'non-delivery' });
      expect((await get('bob', '/milestones?taskId=t6')).body.data.every((m: any) => m.status === 'cancelled')).toBe(true);
      // Not while work is waiting for review.
      await submitM4();
      expect((await post('client', '/tasks/t1/end-for-non-delivery')).status).toBe(400);
    });

    it('pays a worker at the fee rate in force when they were hired', async () => {
      const task = (await post('bob', '/tasks', { title: 'Rate lock', description: 'Project details', category: 'Web Development', budget: 400 })).body.data;
      const ms = (await post('bob', '/milestones', { taskId: task.id, title: 'All of it', budget: 400 })).body.data;
      await take('worker', task.id);
      expect((await patch('revenue', '/revenue/fee-config', { workerServicePercents: [90, 90, 90] })).status).toBe(200);
      await post('worker', `/milestones/${ms.id}/submit`, { deliverable: DELIV });
      const res = await post('bob', `/milestones/${ms.id}/approve`);
      expect(res.body.data.release).toMatchObject({ rate: 20, net: 320 });
    });

    it('neutralises spreadsheet formulas in the audit-log export', async () => {
      await api().get('/api/users?x==HYPERLINK("http://evil")').set(as('worker'));
      await post('worker', '/users/u2/wallet/add', { amount: 10 });
      const compliance = (await login({ email: 'compliance@gmail.com', password: 'Compliance@123' })).body.data.token;
      const csv = await api().get('/api/audit-log/export').set('Authorization', `Bearer ${compliance}`);
      expect(csv.status).toBe(200);
      expect(csv.text.split('\n').every((line: string) => line.split(',').every((cell: string) => !/^[=+\-@]/.test(cell.replace(/^"/, ''))))).toBe(true);
    });
  });
});
