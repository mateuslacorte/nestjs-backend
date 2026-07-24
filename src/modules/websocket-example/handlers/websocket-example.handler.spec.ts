import { Socket } from 'socket.io';
import { MessagePayload } from '@common/websocket/interfaces/message-handler.interface';
import { Role } from '@modules/auth/enums/role.enum';
import { WebsocketExampleHandler } from './websocket-example.handler';
import { WebsocketExampleService } from '../websocket-example.service';

describe('WebsocketExampleHandler', () => {
  let service: { processMessage: jest.Mock };
  let handler: WebsocketExampleHandler;

  beforeEach(() => {
    service = { processMessage: jest.fn() };
    handler = new WebsocketExampleHandler(
      service as unknown as WebsocketExampleService,
    );
  });

  it('requires SUPER role', () => {
    expect(handler.roles).toEqual([Role.SUPER]);
  });

  describe('canHandle', () => {
    it('returns true only for type "example"', () => {
      expect(handler.canHandle('example')).toBe(true);
      expect(handler.canHandle('other')).toBe(false);
      expect(handler.canHandle('')).toBe(false);
    });
  });

  describe('handle', () => {
    it('validates payload and delegates to the service', async () => {
      const client = { id: 'c1', emit: jest.fn() } as unknown as Socket;
      const payload = {
        type: 'example',
        message: 'hello',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      await handler.handle(client, payload);

      expect(service.processMessage).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          type: 'example',
          message: 'hello',
        }),
      );
      expect(client.emit).not.toHaveBeenCalledWith(
        'error',
        expect.anything(),
      );
    });

    it('emits validation error and skips service when message is missing', async () => {
      const client = { id: 'c1', emit: jest.fn() } as unknown as Socket;

      await handler.handle(client, { type: 'example' });

      expect(service.processMessage).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.any(Array),
        }),
      );
      const emitted = (client.emit as jest.Mock).mock.calls[0][1] as {
        errors: unknown[];
      };
      expect(emitted.errors.length).toBeGreaterThan(0);
    });

    it('emits validation error when type is empty', async () => {
      const client = { id: 'c1', emit: jest.fn() } as unknown as Socket;

      await handler.handle(client, { type: '', message: 'hi' });

      expect(service.processMessage).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Validation failed' }),
      );
    });

    it('applies DTO defaults for type and timestamp when omitted', async () => {
      const client = { id: 'c1', emit: jest.fn() } as unknown as Socket;

      await handler.handle(client, {
        message: 'only-message',
      } as unknown as MessagePayload);

      expect(service.processMessage).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          type: 'example',
          message: 'only-message',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
