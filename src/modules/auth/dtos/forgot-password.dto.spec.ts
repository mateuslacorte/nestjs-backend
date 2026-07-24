import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

describe('ForgotPasswordDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(ForgotPasswordDto, plain);
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

  it('accepts a valid email', async () => {
    expect(
      await validateDto({ email: 'user@example.com' }),
    ).toHaveLength(0);
  });

  it('requires email', async () => {
    const errors = await validateDto({});
    expect(errors.some((e) => e.property === 'email')).toBe(true);
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining([expect.stringMatching(/should not be empty/i)]),
    );
  });

  it('rejects invalid email', async () => {
    const errors = await validateDto({ email: 'not-an-email' });
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining([expect.stringMatching(/email/i)]),
    );
  });

  it('rejects empty email', async () => {
    const errors = await validateDto({ email: '' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects non-string email', async () => {
    const errors = await validateDto({ email: 42 });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
