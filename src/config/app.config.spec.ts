describe('app.config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  async function loadAppConfig() {
    return (await import('./app.config')).default;
  }

  it('returns defaults including apiVersion v1', async () => {
    delete process.env.APP_NAME;
    delete process.env.NODE_ENV;
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.APP_URL;
    delete process.env.PUBLIC_URL;
    delete process.env.API_VERSION;
    jest.resetModules();

    const appConfig = await loadAppConfig();
    expect(appConfig()).toEqual({
      name: 'NestJS Backend API',
      environment: 'development',
      host: 'localhost',
      port: 3000,
      publicUrl: '',
      apiVersion: 'v1',
      apiPrefix: 'api/v1',
    });
  });

  it('applies custom env values and strips trailing slash from APP_URL', async () => {
    process.env.APP_NAME = 'My API';
    process.env.NODE_ENV = 'production';
    process.env.HOST = '0.0.0.0';
    process.env.PORT = '8080';
    process.env.APP_URL = 'https://x.com/';
    process.env.PUBLIC_URL = 'https://ignored.com';
    process.env.API_VERSION = 'v1';
    jest.resetModules();

    const appConfig = await loadAppConfig();
    expect(appConfig()).toMatchObject({
      name: 'My API',
      environment: 'production',
      host: '0.0.0.0',
      port: 8080,
      publicUrl: 'https://x.com',
    });
  });

  it('falls back to PUBLIC_URL when APP_URL is unset', async () => {
    delete process.env.APP_URL;
    process.env.PUBLIC_URL = 'https://public.example.com/';
    delete process.env.API_VERSION;
    jest.resetModules();

    const appConfig = await loadAppConfig();
    expect(appConfig().publicUrl).toBe('https://public.example.com');
  });

  it('maps PORT=0 and invalid PORT to 3000', async () => {
    delete process.env.API_VERSION;
    jest.resetModules();
    let appConfig = await loadAppConfig();

    process.env.PORT = '0';
    expect(appConfig().port).toBe(3000);

    process.env.PORT = 'abc';
    expect(appConfig().port).toBe(3000);
  });

  it('captures API_VERSION at module import time', async () => {
    process.env.API_VERSION = 'v2';
    jest.resetModules();

    const appConfig = await loadAppConfig();
    expect(appConfig()).toMatchObject({
      apiVersion: 'v2',
      apiPrefix: 'api/v2',
    });
  });
});
