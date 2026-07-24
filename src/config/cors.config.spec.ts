import corsConfig from './cors.config';

describe('cors.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.APP_URL;
    delete process.env.PUBLIC_URL;
    delete process.env.CORS_ORIGINS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults with local self origins and credentials true', () => {
    const config = corsConfig();

    expect(config.credentials).toBe(true);
    expect(config.extraOrigins).toEqual([]);
    expect(config.selfOrigins).toEqual(
      expect.arrayContaining([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]),
    );
    expect(config.origins).toEqual(config.selfOrigins);
  });

  it('reflects custom HOST, PORT, and APP_URL in selfOrigins', () => {
    process.env.HOST = 'api.example.com';
    process.env.PORT = '4000';
    process.env.APP_URL = 'https://app.example.com/';

    const config = corsConfig();

    expect(config.selfOrigins).toEqual(
      expect.arrayContaining([
        'http://api.example.com:4000',
        'https://app.example.com',
      ]),
    );
  });

  it('populates extraOrigins from CORS_ORIGINS and merges into origins', () => {
    process.env.CORS_ORIGINS = 'https://client.example.com';

    const config = corsConfig();

    expect(config.extraOrigins).toEqual(['https://client.example.com']);
    expect(config.origins).toContain('https://client.example.com');
  });

  it('dedupes overlapping self and CORS origins', () => {
    process.env.HOST = 'localhost';
    process.env.PORT = '3000';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const config = corsConfig();

    expect(
      config.origins.filter((o) => o === 'http://localhost:3000'),
    ).toHaveLength(1);
  });

  it('treats non-finite PORT as 3000', () => {
    process.env.PORT = 'abc';

    const config = corsConfig();

    expect(config.selfOrigins).toEqual(
      expect.arrayContaining([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]),
    );
  });
});
