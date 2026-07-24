import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendWhatsappDto } from './send-whatsapp.dto';

describe('SendWhatsappDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(SendWhatsappDto, plain);
    return validate(dto);
  }

  it('accepts a valid payload', async () => {
    const errors = await validateDto({
      to: '5511999999999',
      message: 'Hello, this is a test message',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires to', async () => {
    const errors = await validateDto({ message: 'hi' });
    const toError = errors.find((e) => e.property === 'to');
    expect(toError).toBeDefined();
    expect(Object.values(toError!.constraints ?? {})).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/required|string/i),
      ]),
    );
  });

  it('rejects empty to', async () => {
    const errors = await validateDto({ to: '', message: 'hi' });
    expect(errors.some((e) => e.property === 'to')).toBe(true);
  });

  it('rejects non-digit to values', async () => {
    const errors = await validateDto({
      to: '+55 11 99999-9999',
      message: 'hi',
    });
    const toError = errors.find((e) => e.property === 'to');
    expect(toError?.constraints).toEqual(
      expect.objectContaining({
        matches: 'Phone number must contain only digits',
      }),
    );
  });

  it('rejects non-string to', async () => {
    const errors = await validateDto({
      to: 5511999999999,
      message: 'hi',
    });
    expect(errors.some((e) => e.property === 'to')).toBe(true);
  });

  it('requires message', async () => {
    const errors = await validateDto({ to: '5511999999999' });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects empty message', async () => {
    const errors = await validateDto({ to: '5511999999999', message: '' });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects non-string message', async () => {
    const errors = await validateDto({
      to: '5511999999999',
      message: 123,
    });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });
});
