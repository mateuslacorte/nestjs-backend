import bcryptConfig from './bcrypt.config';

describe('bcrypt.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BCRYPT_HASH_FACTOR;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parses default "12" with radix 12 as decimal 14', () => {
    expect(bcryptConfig()).toEqual({ saltRounds: 14 });
  });

  it('parses BCRYPT_HASH_FACTOR=10 with radix 12 as decimal 12', () => {
    process.env.BCRYPT_HASH_FACTOR = '10';
    expect(bcryptConfig()).toEqual({ saltRounds: 12 });
  });
});
