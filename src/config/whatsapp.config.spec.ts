import whatsappConfig from './whatsapp.config';

describe('whatsapp.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_INSTANCE;
    delete process.env.EVOLUTION_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(whatsappConfig()).toEqual({
      url: 'localhost',
      instance: 'default',
      key: '',
    });
  });

  it('applies overrides', () => {
    process.env.EVOLUTION_API_URL = 'https://evo.example.com';
    process.env.EVOLUTION_API_INSTANCE = 'prod';
    process.env.EVOLUTION_API_KEY = 'secret';

    expect(whatsappConfig()).toEqual({
      url: 'https://evo.example.com',
      instance: 'prod',
      key: 'secret',
    });
  });
});
