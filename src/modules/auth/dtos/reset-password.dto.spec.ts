import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

const VALID_PASSWORD = 'NewStr0ng@Pass1';

describe('ResetPasswordDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(ResetPasswordDto, plain);
    return validate(dto);
  }

  function messages(
    errors: Awaited<ReturnType<typeof validate>>,
    property: string,
  ): string[] {
    return Object.values(
      errors.find((e) => e.property === property)?.constraints ?? {},
    );
  }

  const validBase = {
    token: '123abc456def789ghi',
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };

  it('accepts a valid reset-password payload', async () => {
    expect(await validateDto(validBase)).toHaveLength(0);
  });

  it('requires token', async () => {
    const { token: _token, ...withoutToken } = validBase;
    const errors = await validateDto(withoutToken);
    expect(errors.some((e) => e.property === 'token')).toBe(true);
    expect(messages(errors, 'token')).toEqual(
      expect.arrayContaining([expect.stringMatching(/should not be empty/i)]),
    );
  });

  it('rejects empty token', async () => {
    const errors = await validateDto({ ...validBase, token: '' });
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('rejects password shorter than 8 characters', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 'Ab1@',
      confirmPassword: 'Ab1@',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining([
        'password must be longer than or equal to 8 characters',
      ]),
    );
  });

  it('rejects password missing required charset', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 'alllowercase1',
      confirmPassword: 'alllowercase1',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining([
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
      ]),
    );
  });

  it('rejects password with disallowed special characters', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 'NewStr0ng#Pass1',
      confirmPassword: 'NewStr0ng#Pass1',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining([
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
      ]),
    );
  });

  it('requires confirmPassword', async () => {
    const { confirmPassword: _confirmPassword, ...withoutConfirm } = validBase;
    const errors = await validateDto(withoutConfirm);
    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
  });

  it('rejects empty confirmPassword', async () => {
    const errors = await validateDto({
      ...validBase,
      confirmPassword: '',
    });
    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
  });

  it('reports multiple validation errors together', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property).sort();
    expect(properties).toEqual(['confirmPassword', 'password', 'token']);
  });
});
