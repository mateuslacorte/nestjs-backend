import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@modules/auth/enums/role.enum';
import { UpdateUserDto } from './update-user.dto';

const VALID_PASSWORD = 'Str0ng!P@ssw0rd';

describe('UpdateUserDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(UpdateUserDto, plain);
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

  it('accepts an empty partial update', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  it('accepts a full valid partial payload', async () => {
    const errors = await validateDto({
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: VALID_PASSWORD,
      isActive: false,
      roles: [Role.USER, Role.ADMIN],
      googleId: 'g-1',
      facebookId: 'fb-1',
      emailVerificationToken: 'tok',
      emailVerificationExpires: new Date('2026-12-31T23:59:59.000Z'),
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const errors = await validateDto({ email: 'bad' });
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining(['Invalid email address']),
    );
  });

  it('rejects weak password', async () => {
    const errors = await validateDto({ password: 'password' });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Invalid password format']),
    );
  });

  it('rejects non-string firstName', async () => {
    const errors = await validateDto({ firstName: 1 });
    expect(messages(errors, 'firstName')).toEqual(
      expect.arrayContaining(['First name must be a string']),
    );
  });

  it('rejects non-string lastName', async () => {
    const errors = await validateDto({ lastName: true });
    expect(messages(errors, 'lastName')).toEqual(
      expect.arrayContaining(['Last name must be a string']),
    );
  });

  it('rejects non-string username', async () => {
    const errors = await validateDto({ username: {} });
    expect(messages(errors, 'username')).toEqual(
      expect.arrayContaining(['Username must be a string']),
    );
  });

  it('rejects non-boolean isActive', async () => {
    const errors = await validateDto({ isActive: 'true' });
    expect(errors.some((e) => e.property === 'isActive')).toBe(true);
  });

  it('rejects invalid roles', async () => {
    const errors = await validateDto({ roles: ['nope'] });
    expect(messages(errors, 'roles')).toEqual(
      expect.arrayContaining([
        'Each role must be a valid Role enum value',
      ]),
    );
  });

  it('rejects non-string emailVerificationToken', async () => {
    const errors = await validateDto({ emailVerificationToken: 123 });
    expect(messages(errors, 'emailVerificationToken')).toEqual(
      expect.arrayContaining([
        'E-mail verification token must be a string',
      ]),
    );
  });

  it('rejects non-Date emailVerificationExpires', async () => {
    const errors = await validateDto({
      emailVerificationExpires: '2026-12-31',
    });
    expect(messages(errors, 'emailVerificationExpires')).toEqual(
      expect.arrayContaining([
        'E-mail verification expiration must be a date',
      ]),
    );
  });

  it('rejects non-string googleId', async () => {
    const errors = await validateDto({ googleId: 99 });
    expect(errors.some((e) => e.property === 'googleId')).toBe(true);
  });

  it('rejects non-string facebookId', async () => {
    const errors = await validateDto({ facebookId: false });
    expect(errors.some((e) => e.property === 'facebookId')).toBe(true);
  });
});
