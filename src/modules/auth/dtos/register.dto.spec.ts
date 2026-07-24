import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const VALID_PASSWORD = 'Str0ng!P@ssw0rd';

describe('RegisterDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(RegisterDto, plain);
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
    firstName: 'Jane',
    lastName: 'Smith',
    username: 'janesmith',
    email: 'jane.smith@example.com',
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };

  it('accepts a valid registration payload', async () => {
    expect(await validateDto(validBase)).toHaveLength(0);
  });

  it.each([
    'firstName',
    'lastName',
    'username',
    'email',
    'password',
    'confirmPassword',
  ] as const)('requires %s', async (field) => {
    const payload = { ...validBase };
    delete payload[field];
    const errors = await validateDto(payload);
    expect(errors.some((e) => e.property === field)).toBe(true);
  });

  it('rejects weak passwords', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Invalid password format']),
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

  it('rejects empty firstName', async () => {
    const errors = await validateDto({ ...validBase, firstName: '' });
    expect(messages(errors, 'firstName')).toEqual(
      expect.arrayContaining(['First name is required']),
    );
  });

  it('rejects empty username', async () => {
    const errors = await validateDto({ ...validBase, username: '' });
    expect(messages(errors, 'username')).toEqual(
      expect.arrayContaining(['Username is required']),
    );
  });

  it('rejects non-string confirmPassword', async () => {
    const errors = await validateDto({
      ...validBase,
      confirmPassword: 123,
    });
    expect(messages(errors, 'confirmPassword')).toEqual(
      expect.arrayContaining(['Confirm password must be a string']),
    );
  });

  it('reports multiple validation errors together', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property).sort();
    expect(properties).toEqual([
      'confirmPassword',
      'email',
      'firstName',
      'lastName',
      'password',
      'username',
    ]);
  });
});
