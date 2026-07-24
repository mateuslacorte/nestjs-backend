import { ArgumentMetadata } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PayloadValidationPipe } from './payload-validation.pipe';

describe('PayloadValidationPipe', () => {
  const pipe = new PayloadValidationPipe();
  const metadata = {
    type: 'body',
    metatype: Object,
    data: '',
  } as ArgumentMetadata;

  it('returns the value when type is present', async () => {
    const value = { type: 'chat', text: 'hi' };
    await expect(pipe.transform(value, metadata)).resolves.toBe(value);
  });

  it('throws WsException when value is null', async () => {
    await expect(pipe.transform(null, metadata)).rejects.toBeInstanceOf(
      WsException,
    );
    await expect(pipe.transform(null, metadata)).rejects.toThrow(
      'Invalid payload: type not specified',
    );
  });

  it('throws WsException when value is undefined', async () => {
    await expect(pipe.transform(undefined, metadata)).rejects.toThrow(
      'Invalid payload: type not specified',
    );
  });

  it('throws WsException when type is missing', async () => {
    await expect(pipe.transform({ text: 'hi' }, metadata)).rejects.toThrow(
      'Invalid payload: type not specified',
    );
  });

  it('throws WsException when type is empty string', async () => {
    await expect(pipe.transform({ type: '' }, metadata)).rejects.toThrow(
      'Invalid payload: type not specified',
    );
  });

  it('accepts additional payload fields alongside type', async () => {
    const value = { type: 'example', foo: 1, bar: [2] };
    await expect(pipe.transform(value, metadata)).resolves.toEqual(value);
  });
});
