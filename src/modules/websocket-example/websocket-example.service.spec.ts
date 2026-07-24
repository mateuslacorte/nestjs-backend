import { Socket } from 'socket.io';
import { WebsocketExampleService } from './websocket-example.service';
import { WebsocketExampleDto } from './dtos/websocket-example.dto';

function createClient(id: string): Socket {
  return {
    id,
    emit: jest.fn(),
  } as unknown as Socket;
}

function createPayload(message: string): WebsocketExampleDto {
  const dto = new WebsocketExampleDto();
  dto.type = 'example';
  dto.message = message;
  dto.timestamp = new Date().toISOString();
  return dto;
}

describe('WebsocketExampleService', () => {
  let service: WebsocketExampleService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new WebsocketExampleService();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('processMessage', () => {
    it('logs, stores ack, and emits websocket_example_ack', () => {
      const client = createClient('c1');
      const payload = createPayload('hello');

      service.processMessage(client, payload);

      expect(logSpy).toHaveBeenCalledWith(
        'Processing websocket example message from hello',
      );
      expect(client.emit).toHaveBeenCalledWith(
        'websocket_example_ack',
        expect.objectContaining({
          received: true,
          timestamp: expect.any(String),
        }),
      );

      const acks = service.getAllClientAcks();
      expect(acks).toHaveLength(1);
      expect(acks[0]).toMatchObject({
        clientId: 'c1',
        message: 'hello',
        lastAckTime: expect.any(Date),
      });
    });

    it('overwrites previous ack for the same client', () => {
      const client = createClient('c1');
      service.processMessage(client, createPayload('first'));
      service.processMessage(client, createPayload('second'));

      const acks = service.getAllClientAcks();
      expect(acks).toHaveLength(1);
      expect(acks[0].message).toBe('second');
    });
  });

  describe('cleanupOldRecords', () => {
    it('removes acks older than 10 seconds on next update', () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(now);

      const clientA = createClient('old');
      const clientB = createClient('fresh');
      service.processMessage(clientA, createPayload('old-msg'));

      jest.setSystemTime(new Date(now.getTime() + 11_000));
      service.processMessage(clientB, createPayload('fresh-msg'));

      const ids = service.getAllClientAcks().map((a) => a.clientId);
      expect(ids).toEqual(['fresh']);
    });

    it('keeps acks that are at most 10 seconds old', () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(now);

      service.processMessage(createClient('a'), createPayload('a'));
      jest.setSystemTime(new Date(now.getTime() + 9_000));
      service.processMessage(createClient('b'), createPayload('b'));

      expect(service.getAllClientAcks().map((a) => a.clientId).sort()).toEqual([
        'a',
        'b',
      ]);
    });
  });

  describe('getRecentlyActiveClients', () => {
    it('returns only clients active within the last 5 seconds', () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(now);

      service.processMessage(createClient('recent'), createPayload('r'));
      jest.setSystemTime(new Date(now.getTime() + 6_000));
      service.processMessage(createClient('new'), createPayload('n'));

      // "recent" is 6s old → excluded; "new" is fresh → included
      // cleanup threshold is 10s, so both still in the map
      expect(service.getAllClientAcks()).toHaveLength(2);
      expect(service.getRecentlyActiveClients()).toEqual([
        expect.objectContaining({ clientId: 'new', message: 'n' }),
      ]);
    });

    it('includes clients at exactly 5 seconds age', () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(now);

      service.processMessage(createClient('edge'), createPayload('e'));
      jest.setSystemTime(new Date(now.getTime() + 5_000));

      expect(service.getRecentlyActiveClients()).toHaveLength(1);
    });

    it('returns empty list when no acks exist', () => {
      expect(service.getRecentlyActiveClients()).toEqual([]);
    });
  });

  describe('getAllClientAcks', () => {
    it('returns all stored acks', () => {
      service.processMessage(createClient('c1'), createPayload('m1'));
      service.processMessage(createClient('c2'), createPayload('m2'));

      expect(service.getAllClientAcks()).toHaveLength(2);
    });
  });
});
