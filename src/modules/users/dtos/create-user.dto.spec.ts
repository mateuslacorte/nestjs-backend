import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@modules/auth/enums/role.enum';
import { CreateUserDto } from './create-user.dto';

const VALID_PASSWORD = 'Str0ng!P@ssw0rd';

describe('CreateUserDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(CreateUserDto, plain);
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
  };

  it('accepts a valid local-password user', async () => {
    expect(await validateDto(validBase)).toHaveLength(0);
  });

  it('accepts optional isActive and roles', async () => {
    const errors = await validateDto({
      ...validBase,
      isActive: true,
      roles: [Role.USER, Role.MANAGER],
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts OAuth user with googleId and no password', async () => {
    const { password: _password, ...withoutPassword } = validBase;
    const errors = await validateDto({
      ...withoutPassword,
      googleId: '108234567890123456789',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts OAuth user with facebookId and no password', async () => {
    const { password: _password, ...withoutPassword } = validBase;
    const errors = await validateDto({
      ...withoutPassword,
      facebookId: '10234567890123456',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts OAuth user with twitterId and no password', async () => {
    const { password: _password, ...withoutPassword } = validBase;
    const errors = await validateDto({
      ...withoutPassword,
      twitterId: '2244994945',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires password when neither googleId, facebookId, nor twitterId is set', async () => {
    const { password: _password, ...withoutPassword } = validBase;
    const errors = await validateDto(withoutPassword);
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/required|password/i),
      ]),
    );
  });

  it('rejects weak passwords', async () => {
    const errors = await validateDto({
      ...validBase,
      password: 'weak',
    });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Invalid password format']),
    );
  });

  it.each(['firstName', 'lastName', 'username', 'email'] as const)(
    'requires %s',
    async (field) => {
      const payload = { ...validBase };
      delete payload[field];
      const errors = await validateDto(payload);
      expect(errors.some((e) => e.property === field)).toBe(true);
    },
  );

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

  it('rejects non-boolean isActive', async () => {
    const errors = await validateDto({
      ...validBase,
      isActive: 'yes',
    });
    expect(errors.some((e) => e.property === 'isActive')).toBe(true);
  });

  it('rejects invalid role enum values', async () => {
    const errors = await validateDto({
      ...validBase,
      roles: ['invalid-role'],
    });
    expect(messages(errors, 'roles')).toEqual(
      expect.arrayContaining([
        'Each role must be a valid Role enum value',
      ]),
    );
  });

  it('rejects non-array roles', async () => {
    const errors = await validateDto({
      ...validBase,
      roles: Role.USER,
    });
    expect(errors.some((e) => e.property === 'roles')).toBe(true);
  });
});
