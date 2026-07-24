import argon2Config from './argon2.config';

describe('argon2.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ARGON2_MEMORY_COST;
    delete process.env.ARGON2_TIME_COST;
    delete process.env.ARGON2_PARALLELISM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns OWASP-aligned defaults', () => {
    expect(argon2Config()).toEqual({
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  });

  it('parses env overrides as decimal', () => {
    process.env.ARGON2_MEMORY_COST = '65536';
    process.env.ARGON2_TIME_COST = '3';
    process.env.ARGON2_PARALLELISM = '2';

    expect(argon2Config()).toEqual({
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 2,
    });
  });

  it('falls back when env values are invalid', () => {
    process.env.ARGON2_MEMORY_COST = '0';
    process.env.ARGON2_TIME_COST = 'nope';
    process.env.ARGON2_PARALLELISM = '-1';

    expect(argon2Config()).toEqual({
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  });
});
