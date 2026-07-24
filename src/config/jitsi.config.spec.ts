import jitsiConfig from './jitsi.config';

describe('jitsi.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JITSI_BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns default baseUrl', () => {
    expect(jitsiConfig()).toEqual({
      baseUrl: 'https://meet.jit.si',
    });
  });

  it('applies JITSI_BASE_URL override', () => {
    process.env.JITSI_BASE_URL = 'https://meet.example.com';
    expect(jitsiConfig()).toEqual({
      baseUrl: 'https://meet.example.com',
    });
  });
});
