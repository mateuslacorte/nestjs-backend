import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { CorsIoAdapter } from './cors-io.adapter';
import { createCorsOriginDelegate } from '@config/cors-origins.util';

jest.mock('@config/cors-origins.util', () => ({
  createCorsOriginDelegate: jest.fn(() => 'origin-delegate'),
}));

describe('CorsIoAdapter', () => {
  const app = {} as INestApplicationContext;
  const allowedOrigins = ['https://app.example.com', 'http://localhost:3000'];
  let createIOServerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    createIOServerSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue('io-server' as never);
  });

  afterEach(() => {
    createIOServerSpy.mockRestore();
  });

  it('forwards port and merges cors options with credentials true by default', () => {
    const adapter = new CorsIoAdapter(app, allowedOrigins);
    const result = adapter.createIOServer(3001, { path: '/ws' });

    expect(result).toBe('io-server');
    expect(createCorsOriginDelegate).toHaveBeenCalledWith(allowedOrigins);
    expect(createIOServerSpy).toHaveBeenCalledWith(3001, {
      path: '/ws',
      cors: {
        origin: 'origin-delegate',
        credentials: true,
      },
    });
  });

  it('honors credentials=false when provided', () => {
    const adapter = new CorsIoAdapter(app, allowedOrigins, false);
    adapter.createIOServer(4000);

    expect(createIOServerSpy).toHaveBeenCalledWith(4000, {
      cors: {
        origin: 'origin-delegate',
        credentials: false,
      },
    });
  });

  it('works when options argument is omitted', () => {
    const adapter = new CorsIoAdapter(app, allowedOrigins);
    adapter.createIOServer(0);

    expect(createIOServerSpy).toHaveBeenCalledWith(0, {
      cors: {
        origin: 'origin-delegate',
        credentials: true,
      },
    });
  });

  it('overrides any cors key from incoming options', () => {
    const adapter = new CorsIoAdapter(app, allowedOrigins);
    adapter.createIOServer(3000, {
      cors: {
        origin: 'should-be-replaced',
        credentials: false,
      },
    } as never);

    expect(createIOServerSpy).toHaveBeenCalledWith(3000, {
      cors: {
        origin: 'origin-delegate',
        credentials: true,
      },
    });
  });
});
