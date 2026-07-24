import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(LoginDto, plain);
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
    email: 'john.doe@example.com',
    password: 'StrongP@ssw0rd123',
  };

  it('accepts a valid login payload', async () => {
    expect(await validateDto(validBase)).toHaveLength(0);
  });

  it('requires email', async () => {
    const errors = await validateDto({ password: validBase.password });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining(['Email is required']),
    );
  });

  it('requires password', async () => {
    const errors = await validateDto({ email: validBase.email });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Password is required']),
    );
  });

  it('rejects invalid email', async () => {
    const errors = await validateDto({
      ...validBase,
      email: 'not-an-email',
    });
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining(['Invalid email address']),
    );
  });

  it('rejects empty email', async () => {
    const errors = await validateDto({
      ...validBase,
      email: '',
    });
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining(['Email is required']),
    );
  });

  it('rejects empty password', async () => {
    const errors = await validateDto({
      ...validBase,
      password: '',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Password is required']),
    );
  });

  it('rejects non-string password', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 12345,
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Password must be a string']),
    );
  });

  it('reports both fields when payload is empty', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property).sort();
    expect(properties).toEqual(['email', 'password']);
  });
});
