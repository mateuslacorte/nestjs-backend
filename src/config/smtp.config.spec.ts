import smtpConfig from './smtp.config';

describe('smtp.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_REQUIRE_TLS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults without auth', () => {
    expect(smtpConfig()).toEqual({
      host: 'localhost',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: undefined,
      from: 'noreply@example.com',
    });
  });

  it('builds auth when SMTP_USER is set and uses user as from', () => {
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASSWORD = 'pass';

    expect(smtpConfig()).toMatchObject({
      auth: { user: 'mailer@example.com', pass: 'pass' },
      from: 'mailer@example.com',
    });
  });

  it('prefers SMTP_FROM over user', () => {
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_FROM = 'noreply@brand.com';

    expect(smtpConfig().from).toBe('noreply@brand.com');
  });

  it('disables requireTLS only when SMTP_REQUIRE_TLS is false', () => {
    process.env.SMTP_REQUIRE_TLS = 'false';
    expect(smtpConfig().requireTLS).toBe(false);
  });

  it('enables secure only for exact true', () => {
    process.env.SMTP_SECURE = 'true';
    expect(smtpConfig().secure).toBe(true);

    process.env.SMTP_SECURE = '1';
    expect(smtpConfig().secure).toBe(false);
  });

  it('applies host and port overrides', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '465';

    expect(smtpConfig()).toMatchObject({
      host: 'smtp.example.com',
      port: 465,
    });
  });
});
