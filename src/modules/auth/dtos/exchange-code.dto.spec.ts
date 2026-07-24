import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExchangeCodeDto } from './exchange-code.dto';

describe('ExchangeCodeDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(ExchangeCodeDto, plain);
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

  it('accepts a valid exchange code', async () => {
    expect(
      await validateDto({ code: 'dGhpcyBpcyBhbiBleGNoYW5nZSBjb2Rl' }),
    ).toHaveLength(0);
  });

  it('requires code', async () => {
    const errors = await validateDto({});
    expect(errors.some((e) => e.property === 'code')).toBe(true);
    expect(messages(errors, 'code')).toEqual(
      expect.arrayContaining([expect.stringMatching(/should not be empty/i)]),
    );
  });

  it('rejects empty code', async () => {
    const errors = await validateDto({ code: '' });
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('rejects non-string code', async () => {
    const errors = await validateDto({ code: 12345 });
    expect(messages(errors, 'code')).toEqual(
      expect.arrayContaining([expect.stringMatching(/must be a string/i)]),
    );
  });
});
