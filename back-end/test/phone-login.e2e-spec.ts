import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/** Signing in with the phone number saved in profile settings, instead of the email. */
describe('Sign in with phone number (e2e)', () => {
  let app: INestApplication;
  const PHONE = '+919876543210';

  const api = () => request(app.getHttpServer());
  let ip = 1;
  const from = () => `10.2.${Math.floor(ip / 250)}.${ip++ % 250}`;
  const login = (body: any) => api().post('/api/auth/login').set('X-Forwarded-For', from()).send(body);
  const tokenOf = async (email: string, password = 'Password@123') => (await login({ email, password })).body.data.token;
  const setPhone = async (userId: string, email: string, phone: string) =>
    api().patch(`/api/users/${userId}`).set('Authorization', `Bearer ${await tokenOf(email)}`).send({ phone, phoneCountryCode: '+91' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    const superToken = await tokenOf('super@gmail.com', 'Superadmin@123');
    expect((await api().post('/api/seed/reset').set('Authorization', `Bearer ${superToken}`)).status).toBe(201);
  });

  it('signs in with a saved phone number and gets a working token', async () => {
    expect((await setPhone('u1', 'client@gmail.com', PHONE)).status).toBe(200);
    const res = await login({ phone: PHONE, password: 'Password@123' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.id).toBe('u1');
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('client@gmail.com');
  });

  it('gives one answer for a wrong password and an unknown number', async () => {
    await setPhone('u1', 'client@gmail.com', PHONE);
    const wrong = await login({ phone: PHONE, password: 'Wrong@1234' });
    const unknown = await login({ phone: '+919999999999', password: 'Password@123' });
    expect(wrong.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrong.body.message).toBe('Incorrect phone number or password.');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('refuses a phone number another account already uses', async () => {
    await setPhone('u1', 'client@gmail.com', PHONE);
    const clash = await setPhone('u8', 'bob@gmail.com', PHONE);
    expect(clash.status).toBe(400);
    expect(clash.body.message).toMatch(/already uses this phone number/);
    // Saving your own number again is not a clash.
    expect((await setPhone('u1', 'client@gmail.com', PHONE)).status).toBe(200);
  });

  it('needs an email or a phone, and a phone with its country code', async () => {
    expect((await login({ password: 'Password@123' })).status).toBe(400);
    const bare = await login({ phone: '9876543210', password: 'Password@123' });
    expect(bare.status).toBe(400);
    expect(bare.body.message).toMatch(/country code/);
  });

  describe('signup', () => {
    const signup = (body: any) => api().post('/api/users').set('X-Forwarded-For', from()).send({
      name: 'New Person', password: 'Signed-Up1!', role: 'worker', ...body,
    });

    it('requires a phone number', async () => {
      const res = await signup({ email: 'no.phone@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/phone number/);
    });

    it('stores the phone, which then signs in', async () => {
      const res = await signup({ email: 'with.phone@example.com', phone: '+919811112222', phoneCountryCode: '+91' });
      expect(res.status).toBe(201);
      expect(res.body.data.phone).toBe('+919811112222');
      expect(res.body.data.phoneCountryCode).toBe('+91');
      expect((await login({ phone: '+919811112222', password: 'Signed-Up1!' })).status).toBe(201);
    });

    it('refuses a phone another account already uses', async () => {
      expect((await signup({ email: 'first@example.com', phone: '+919811113333' })).status).toBe(201);
      const second = await signup({ email: 'second@example.com', phone: '+919811113333' });
      expect(second.status).toBe(400);
      expect(second.body.message).toMatch(/already uses this phone number/);
    });

    it('refuses a phone without its country code', async () => {
      expect((await signup({ email: 'bare@example.com', phone: '9811114444' })).status).toBe(400);
    });

    it('a profile save can still clear the phone', async () => {
      await setPhone('u1', 'client@gmail.com', PHONE);
      expect((await setPhone('u1', 'client@gmail.com', '')).status).toBe(200);
    });
  });

  it('an approved expert applicant can sign in with the phone they applied with', async () => {
    const created = await api().post('/api/expert-applications').send({
      name: 'Asha Reviewer', email: 'asha.reviewer@example.com', password: 'Reviewer-1!',
      phone: '98112 55555', phoneCountry: '+91', expertise: 'Machine Learning',
    });
    expect(created.status).toBe(201);
    const intake = await tokenOf('intake@gmail.com', 'Intake@123');
    const approve = await api().patch(`/api/expert-applications/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${intake}`).send({ status: 'approved' });
    expect(approve.status).toBe(200);
    expect((await login({ phone: '+919811255555', password: 'Reviewer-1!' })).status).toBe(201);
  });

  it('email sign-in is unchanged', async () => {
    expect((await login({ email: 'client@gmail.com', password: 'Password@123' })).status).toBe(201);
  });
});
