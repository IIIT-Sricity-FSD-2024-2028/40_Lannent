import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MailService, OutgoingMail } from '../src/common/mail/mail.service';
import { PasswordResetService, RESET_TOKEN_TTL_MS } from '../src/modules/auth/password-reset.service';

/**
 * Forgot-password, end to end, with the SMTP transport swapped for an outbox
 * the test can read. Everything else — routes, throttles, sanitising, token
 * versions — is the real module graph.
 */
describe('Password reset by email (e2e)', () => {
  let app: INestApplication;
  const outbox: OutgoingMail[] = [];
  let configured = true;
  const fakeMail = {
    isConfigured: () => configured,
    send: async (m: OutgoingMail) => { outbox.push(m); },
    onModuleInit: async () => {},
  };

  const api = () => request(app.getHttpServer());
  let ip = 1;
  const from = () => `10.1.${Math.floor(ip / 250)}.${ip++ % 250}`;
  const post = (path: string, body: any, token?: string) => {
    const r = api().post('/api' + path).set('X-Forwarded-For', from());
    return (token ? r.set('Authorization', `Bearer ${token}`) : r).send(body);
  };
  const login = (email: string, password: string) => post('/auth/login', { email, password });
  const tick = () => new Promise(r => setImmediate(r));
  const tokenFrom = (mail: OutgoingMail) => /#token=([\w-]+)/.exec(mail.text)![1];
  const DEMO_INBOX = 'demo-inbox@example.com';
  /** The reset email for this account, wherever it was delivered. */
  const mailFor = (email: string) => outbox.filter(m => m.text.includes(`account (${email})`)).pop();

  /** Asks for a link and returns the token from the email it sends. */
  const requestLink = async (email: string) => {
    const res = await post('/auth/forgot-password', { email });
    expect(res.status).toBe(201);
    await tick();
    const mail = mailFor(email);
    expect(mail).toBeDefined();
    return tokenFrom(mail!);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService).useValue(fakeMail)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    (app as any).getHttpAdapter().getInstance().set('trust proxy', true);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  beforeEach(async () => {
    outbox.length = 0;
    configured = true;
    process.env.DEMO_MAIL_TO = DEMO_INBOX;
    const superToken = (await login('super@gmail.com', 'Superadmin@123')).body.data.token;
    expect((await post('/seed/reset', {}, superToken)).status).toBe(201);
  });

  it('emails a signed-up account at its own address', async () => {
    const email = 'real.person@example.com';
    expect((await post('/users', { name: 'Real Person', email, phone: '+919812345678', phoneCountryCode: '+91', password: 'Signed-Up1!', role: 'client' })).status).toBe(201);
    const res = await post('/auth/forgot-password', { email });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ sent: true, expiresInMinutes: RESET_TOKEN_TTL_MS / 60_000 });
    await tick();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(email);
    expect(outbox[0].subject).toBe('Reset your Lannent password');
    expect(outbox[0].text).not.toContain('Demo account');
    expect(outbox[0].html).toContain('/reset-password#token=');
    // And the link works for that account.
    const token = tokenFrom(outbox[0]);
    expect((await post('/auth/reset-password', { token, password: 'Recovered-1!' })).status).toBe(201);
    expect((await login(email, 'Recovered-1!')).status).toBe(201);
  });

  it('sends a demo account\'s email to the demo inbox, never to its own address', async () => {
    expect((await post('/auth/forgot-password', { email: 'client@gmail.com' })).status).toBe(201);
    await tick();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(DEMO_INBOX);
    expect(outbox[0].subject).toBe('[Demo: client@gmail.com] Reset your Lannent password');
    expect(outbox[0].text).toContain('Demo account');
    expect(outbox[0].html).toContain('client@gmail.com');
  });

  it('with no demo inbox set, a demo account gets no email at all — and the answer is unchanged', async () => {
    delete process.env.DEMO_MAIL_TO;
    const demo = await post('/auth/forgot-password', { email: 'worker@gmail.com' });
    const unknown = await post('/auth/forgot-password', { email: 'nobody-here@gmail.com' });
    expect(demo.status).toBe(201);
    expect(demo.body).toEqual(unknown.body);
    await tick();
    expect(outbox).toHaveLength(0);
  });

  it('answers an unknown email exactly the same, and sends nothing', async () => {
    const known = await post('/auth/forgot-password', { email: 'client@gmail.com' });
    const unknown = await post('/auth/forgot-password', { email: 'nobody-here@gmail.com' });
    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    await tick();
    expect(outbox).toHaveLength(1);
    expect(mailFor('client@gmail.com')).toBeDefined();
  });

  it('resets the password, signs out old sessions, and spends the link', async () => {
    const oldSession = (await login('client@gmail.com', 'Password@123')).body.data.token;
    const token = await requestLink('client@gmail.com');

    expect((await post('/auth/reset-password/check', { token })).status).toBe(201);
    const res = await post('/auth/reset-password', { token, password: 'Brand-New1!' });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ reset: true });

    expect((await login('client@gmail.com', 'Password@123')).status).toBe(400);
    expect((await login('client@gmail.com', 'Brand-New1!')).status).toBe(201);
    // The session from before the reset no longer works.
    expect((await api().get('/api/tasks').set('Authorization', `Bearer ${oldSession}`)).status).toBe(401);
    // Once only.
    expect((await post('/auth/reset-password', { token, password: 'Another-One2!' })).status).toBe(400);
  });

  it('refuses a weak password without spending the link', async () => {
    const token = await requestLink('worker@gmail.com');
    const weak = await post('/auth/reset-password', { token, password: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.message).toMatch(/at least 8 characters/);
    expect((await post('/auth/reset-password', { token, password: 'Strong-Pass1!' })).status).toBe(201);
  });

  it('refuses a made-up or expired link', async () => {
    expect((await post('/auth/reset-password/check', { token: 'not-a-real-token' })).status).toBe(400);
    const token = await requestLink('client@gmail.com');
    const realNow = Date.now;
    Date.now = () => realNow() + RESET_TOKEN_TTL_MS + 1000;
    try {
      const res = await post('/auth/reset-password', { token, password: 'Brand-New1!' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or has expired/);
    } finally {
      Date.now = realNow;
    }
  });

  it('a newer link replaces the older one', async () => {
    const first = await requestLink('client@gmail.com');
    // The per-account cooldown would hold back a second email inside a minute.
    const realNow = Date.now;
    Date.now = () => realNow() + 61_000;
    try {
      const second = await requestLink('client@gmail.com');
      expect(second).not.toBe(first);
      expect((await post('/auth/reset-password/check', { token: first })).status).toBe(400);
      expect((await post('/auth/reset-password/check', { token: second })).status).toBe(201);
    } finally {
      Date.now = realNow;
    }
  });

  it('holds back repeat emails inside the cooldown', async () => {
    await post('/auth/forgot-password', { email: 'client@gmail.com' });
    await post('/auth/forgot-password', { email: 'client@gmail.com' });
    await tick();
    expect(outbox).toHaveLength(1);
  });

  it('changing the password another way kills an outstanding link', async () => {
    const token = await requestLink('client@gmail.com');
    const session = (await login('client@gmail.com', 'Password@123')).body.data.token;
    const changed = await post('/users/u1/password', { currentPassword: 'Password@123', newPassword: 'Changed-It1!' }, session);
    expect(changed.status).toBe(201);
    expect((await post('/auth/reset-password', { token, password: 'Brand-New1!' })).status).toBe(400);
  });

  it('sends nothing to a suspended account', async () => {
    const superToken = (await login('super@gmail.com', 'Superadmin@123')).body.data.token;
    const r = await api().patch('/api/users/u2').set('Authorization', `Bearer ${superToken}`).send({ status: 'suspended' });
    expect(r.status).toBe(200);
    expect((await post('/auth/forgot-password', { email: 'worker@gmail.com' })).status).toBe(201);
    await tick();
    expect(outbox).toHaveLength(0);
  });

  it('says so when email is not set up, for every address alike', async () => {
    configured = false;
    const a = await post('/auth/forgot-password', { email: 'client@gmail.com' });
    const b = await post('/auth/forgot-password', { email: 'nobody-here@gmail.com' });
    expect(a.status).toBe(503);
    expect(b.body).toEqual(a.body);
  });

  it('a seed reset voids links issued before it', async () => {
    const token = await requestLink('client@gmail.com');
    app.get(PasswordResetService).resetToSeed();
    expect((await post('/auth/reset-password/check', { token })).status).toBe(400);
  });

  it('keeps a password containing markup byte-for-byte', async () => {
    const token = await requestLink('client@gmail.com');
    expect((await post('/auth/reset-password', { token, password: 'Tag<b>it1!' })).status).toBe(201);
    expect((await login('client@gmail.com', 'Tag<b>it1!')).status).toBe(201);
    // And through change-password, whose fields the sanitiser used to rewrite.
    const session = (await login('client@gmail.com', 'Tag<b>it1!')).body.data.token;
    expect((await post('/users/u1/password', { currentPassword: 'Tag<b>it1!', newPassword: 'New<i>one2!' }, session)).status).toBe(201);
    expect((await login('client@gmail.com', 'New<i>one2!')).status).toBe(201);
  });
});
