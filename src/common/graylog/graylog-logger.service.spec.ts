import { GraylogLoggerService } from './graylog-logger.service';
import { GraylogService } from './graylog.service';

describe('GraylogLoggerService', () => {
  let logger: GraylogLoggerService;
  let graylogService: { write: jest.Mock };

  beforeEach(() => {
    graylogService = { write: jest.fn() };
    logger = new GraylogLoggerService(
      graylogService as unknown as GraylogService,
    );
  });

  describe('log', () => {
    it('delegates to write at info level with context', () => {
      logger.log('hello', 'App');
      expect(graylogService.write).toHaveBeenCalledWith(
        'hello',
        { context: 'App' },
        'info',
      );
    });

    it('passes undefined context when omitted', () => {
      logger.log('hello');
      expect(graylogService.write).toHaveBeenCalledWith(
        'hello',
        { context: undefined },
        'info',
      );
    });
  });

  describe('error', () => {
    it('extracts message and stack when message is an Error', () => {
      const err = new Error('boom');
      logger.error(err, 'trace-line', 'AuthService');

      expect(graylogService.write).toHaveBeenCalledWith(
        'boom',
        {
          context: 'AuthService',
          trace: 'trace-line',
          stack: err.stack,
        },
        'error',
      );
    });

    it('forwards string messages with optional trace and context', () => {
      logger.error('failed', 'stack-trace', 'UsersService');

      expect(graylogService.write).toHaveBeenCalledWith(
        'failed',
        { context: 'UsersService', trace: 'stack-trace' },
        'error',
      );
    });

    it('omits stack when message is not an Error', () => {
      logger.error('failed');

      expect(graylogService.write).toHaveBeenCalledWith(
        'failed',
        { context: undefined, trace: undefined },
        'error',
      );
      const [, ctx] = graylogService.write.mock.calls[0];
      expect(ctx).not.toHaveProperty('stack');
    });
  });

  describe('warn / debug / verbose', () => {
    it.each([
      ['warn', 'warn'],
      ['debug', 'debug'],
      ['verbose', 'verbose'],
    ] as const)('%s delegates to write at %s level', (method, level) => {
      logger[method]('payload', 'Ctx');
      expect(graylogService.write).toHaveBeenCalledWith(
        'payload',
        { context: 'Ctx' },
        level,
      );
    });
  });
});
