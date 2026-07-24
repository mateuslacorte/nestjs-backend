import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RefreshtokenDto } from './refreshtoken.dto';

describe('RefreshtokenDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(RefreshtokenDto, plain);
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

  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2NzI4NDAwfQ.signature';

  it('accepts a valid refresh token payload', async () => {
    expect(await validateDto({ refreshToken: validToken })).toHaveLength(0);
  });

  it('requires refreshToken', async () => {
    const errors = await validateDto({});
    expect(errors.some((e) => e.property === 'refreshToken')).toBe(true);
    expect(messages(errors, 'refreshToken')).toEqual(
      expect.arrayContaining(['Refresh token is required']),
    );
  });

  it('rejects empty refreshToken', async () => {
    const errors = await validateDto({ refreshToken: '' });
    expect(messages(errors, 'refreshToken')).toEqual(
      expect.arrayContaining(['Refresh token is required']),
    );
  });

  it('rejects non-string refreshToken', async () => {
    const errors = await validateDto({ refreshToken: 12345 });
    expect(messages(errors, 'refreshToken')).toEqual(
      expect.arrayContaining(['Refresh token must be a string']),
    );
  });
});
