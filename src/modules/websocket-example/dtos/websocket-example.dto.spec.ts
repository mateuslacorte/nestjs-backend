import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WebsocketExampleDto } from './websocket-example.dto';

describe('WebsocketExampleDto', () => {
  async function validatePlain(plain: Record<string, unknown>) {
    const dto = plainToInstance(WebsocketExampleDto, plain);
    return { dto, errors: await validate(dto) };
  }

  it('accepts a full valid payload', async () => {
    const { errors } = await validatePlain({
      type: 'example',
      message: 'hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
    expect(errors).toHaveLength(0);
  });

  it('applies default type and timestamp when constructed directly', async () => {
    const dto = new WebsocketExampleDto();
    dto.message = 'hi';
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.type).toBe('example');
    expect(dto.timestamp).toEqual(expect.any(String));
  });

  it('requires message', async () => {
    const { errors } = await validatePlain({ type: 'example' });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects empty message', async () => {
    const { errors } = await validatePlain({
      type: 'example',
      message: '',
    });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects empty type', async () => {
    const { errors } = await validatePlain({
      type: '',
      message: 'hi',
    });
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('rejects non-string message', async () => {
    const { errors } = await validatePlain({
      type: 'example',
      message: 123,
    });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects non-string type', async () => {
    const { errors } = await validatePlain({
      type: 1,
      message: 'hi',
    });
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('rejects non-string timestamp', async () => {
    const { errors } = await validatePlain({
      type: 'example',
      message: 'hi',
      timestamp: 123,
    });
    expect(errors.some((e) => e.property === 'timestamp')).toBe(true);
  });
});
