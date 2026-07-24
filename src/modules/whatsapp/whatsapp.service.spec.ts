import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

function createConfigService(
  overrides: Partial<{
    key: string;
    url: string;
    instance: string;
  }> = {},
): ConfigService {
  const values: Record<string, string | undefined> = {
    'whatsapp.key': overrides.key,
    'whatsapp.url': overrides.url ?? 'https://evo.example.com',
    'whatsapp.instance': overrides.instance ?? 'default',
  };

  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('WhatsappService', () => {
  let fetchSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    errorSpy?.mockRestore();
    debugSpy?.mockRestore();
  });

  function createService(
    configOverrides?: Partial<{ key: string; url: string; instance: string }>,
  ): WhatsappService {
    const service = new WhatsappService(createConfigService(configOverrides));
    errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
    debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
    return service;
  }

  describe('configuration', () => {
    it('reads whatsapp key, url, and instance from ConfigService', () => {
      const config = createConfigService({
        key: 'api-key',
        url: 'https://evo.test',
        instance: 'prod',
      });
      const service = new WhatsappService(config);

      expect(config.get).toHaveBeenCalledWith('whatsapp.key');
      expect(config.get).toHaveBeenCalledWith('whatsapp.url');
      expect(config.get).toHaveBeenCalledWith('whatsapp.instance');
      expect(service['apiKey']).toBe('api-key');
      expect(service['apiUrl']).toBe('https://evo.test');
      expect(service['instance']).toBe('prod');
    });
  });

  describe('sendMessage', () => {
    it('throws ServiceUnavailableException when apiUrl is missing', async () => {
      const config = {
        get: jest.fn((key: string) =>
          key === 'whatsapp.url'
            ? undefined
            : key === 'whatsapp.instance'
              ? 'default'
              : 'key',
        ),
      } as unknown as ConfigService;
      const svc = new WhatsappService(config);
      errorSpy = jest.spyOn(svc['logger'], 'error').mockImplementation();
      debugSpy = jest.spyOn(svc['logger'], 'debug').mockImplementation();

      await expect(svc.sendMessage('5511999999999', 'hi')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(svc.sendMessage('5511999999999', 'hi')).rejects.toThrow(
        'WhatsApp Evolution API is not configured',
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when instance is missing', async () => {
      const config = {
        get: jest.fn((key: string) =>
          key === 'whatsapp.instance'
            ? undefined
            : key === 'whatsapp.url'
              ? 'https://evo.example.com'
              : 'key',
        ),
      } as unknown as ConfigService;
      const svc = new WhatsappService(config);
      errorSpy = jest.spyOn(svc['logger'], 'error').mockImplementation();
      debugSpy = jest.spyOn(svc['logger'], 'debug').mockImplementation();

      await expect(svc.sendMessage('5511999999999', 'hi')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('POSTs to Evolution sendText endpoint with number and text', async () => {
      const service = createService({
        key: 'secret-key',
        url: 'https://evo.example.com',
        instance: 'main',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"key":"ok"}'),
      });

      await service.sendMessage('5511999999999', 'Hello');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://evo.example.com/message/sendText/main',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apiKey: 'secret-key',
          },
          body: JSON.stringify({
            number: '5511999999999',
            text: 'Hello',
          }),
        },
      );
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('WhatsApp message sent to 5511999999999'),
      );
    });

    it('sends empty apiKey header when key is unset', async () => {
      const config = {
        get: jest.fn((key: string) => {
          if (key === 'whatsapp.key') return undefined;
          if (key === 'whatsapp.url') return 'https://evo.example.com';
          if (key === 'whatsapp.instance') return 'default';
          return undefined;
        }),
      } as unknown as ConfigService;
      const service = new WhatsappService(config);
      errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();

      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('ok'),
      });

      await service.sendMessage('123', 'msg');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ apiKey: '' }),
        }),
      );
    });

    it('throws BadGatewayException when fetch itself fails', async () => {
      const service = createService();
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.sendMessage('5511', 'hi')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      await expect(service.sendMessage('5511', 'hi')).rejects.toThrow(
        'Failed to reach WhatsApp Evolution API',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to reach Evolution API',
        expect.any(Error),
      );
    });

    it('throws BadGatewayException when Evolution API returns non-OK', async () => {
      const service = createService();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('internal error'),
      });

      await expect(service.sendMessage('5511', 'hi')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      await expect(service.sendMessage('5511', 'hi')).rejects.toThrow(
        'WhatsApp Evolution API error (500)',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Evolution API returned 500: internal error',
      );
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('does not alter the phone number (no DDI prefix)', async () => {
      const service = createService();
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('ok'),
      });

      await service.sendMessage('11999999999', 'ping');

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.number).toBe('11999999999');
    });
  });
});
