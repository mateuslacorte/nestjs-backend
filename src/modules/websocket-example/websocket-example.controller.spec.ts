import { WebsocketExampleController } from './websocket-example.controller';
import { WebsocketExampleService } from './websocket-example.service';

describe('WebsocketExampleController', () => {
  let service: { getRecentlyActiveClients: jest.Mock };
  let controller: WebsocketExampleController;

  beforeEach(() => {
    service = {
      getRecentlyActiveClients: jest.fn(),
    };
    controller = new WebsocketExampleController(
      service as unknown as WebsocketExampleService,
    );
  });

  describe('getOnlineWebsocketExamples', () => {
    it('maps active clients to clientId and message', () => {
      service.getRecentlyActiveClients.mockReturnValue([
        {
          clientId: 'c1',
          message: 'hello',
          lastAckTime: new Date(),
        },
        {
          clientId: 'c2',
          message: 'world',
          lastAckTime: new Date(),
        },
      ]);

      expect(controller.getOnlineWebsocketExamples()).toEqual([
        { clientId: 'c1', message: 'hello' },
        { clientId: 'c2', message: 'world' },
      ]);
      expect(service.getRecentlyActiveClients).toHaveBeenCalledTimes(1);
    });

    it('returns an empty list when no clients are active', () => {
      service.getRecentlyActiveClients.mockReturnValue([]);
      expect(controller.getOnlineWebsocketExamples()).toEqual([]);
    });
  });
});
