import * as argon2 from 'argon2';
import {
  hashPassword,
  isPasswordHashed,
  resolveArgon2Options,
  verifyPassword,
} from './password.util';

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

const argon2Hash = argon2.hash as jest.Mock;
const argon2Verify = argon2.verify as jest.Mock;

describe('password.util', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ARGON2_MEMORY_COST;
    delete process.env.ARGON2_TIME_COST;
    delete process.env.ARGON2_PARALLELISM;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveArgon2Options', () => {
    it('uses defaults when env is unset', () => {
      expect(resolveArgon2Options()).toEqual({
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    });

    it('prefers explicit overrides over env', () => {
      process.env.ARGON2_MEMORY_COST = '65536';
      expect(
        resolveArgon2Options({ memoryCost: 1024, timeCost: 4, parallelism: 2 }),
      ).toEqual({
        memoryCost: 1024,
        timeCost: 4,
        parallelism: 2,
      });
    });
  });

  describe('isPasswordHashed', () => {
    it.each([
      ['$argon2id$v=19$m=19456,t=2,p=1$abc', true],
      ['$argon2i$v=19$m=19456,t=2,p=1$abc', true],
      ['$argon2d$v=19$m=19456,t=2,p=1$abc', true],
      ['$2b$10$abcdefghijklmnopqrstuv', false],
      ['plaintext', false],
    ])('detects %s as %s', (value, expected) => {
      expect(isPasswordHashed(value)).toBe(expected);
    });
  });

  describe('hashPassword', () => {
    it('hashes with argon2id and resolved options', async () => {
      argon2Hash.mockResolvedValue('$argon2id$hashed');

      await expect(hashPassword('secret')).resolves.toBe('$argon2id$hashed');
      expect(argon2Hash).toHaveBeenCalledWith('secret', {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    });
  });

  describe('verifyPassword', () => {
    it('returns true when argon2.verify succeeds', async () => {
      argon2Verify.mockResolvedValue(true);
      await expect(verifyPassword('secret', '$argon2id$hash')).resolves.toBe(
        true,
      );
    });

    it('returns false when argon2.verify fails or throws', async () => {
      argon2Verify.mockResolvedValue(false);
      await expect(verifyPassword('secret', '$argon2id$hash')).resolves.toBe(
        false,
      );

      argon2Verify.mockRejectedValue(new Error('invalid'));
      await expect(verifyPassword('secret', 'bad')).resolves.toBe(false);
    });
  });
});
