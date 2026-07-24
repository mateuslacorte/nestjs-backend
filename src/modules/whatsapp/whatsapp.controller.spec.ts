import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappDto } from './dtos/send-whatsapp.dto';

describe('WhatsappController', () => {
  let whatsappService: { sendMessage: jest.Mock };
  let controller: WhatsappController;

  beforeEach(() => {
    whatsappService = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };
    controller = new WhatsappController(
      whatsappService as unknown as WhatsappService,
    );
  });

  describe('sendMessage', () => {
    it('delegates to WhatsappService and returns success payload', async () => {
      const dto: SendWhatsappDto = {
        to: '5511999999999',
        message: 'Hello, this is a test message',
      };

      await expect(controller.sendMessage(dto)).resolves.toEqual({
        message: 'WhatsApp message sent successfully',
      });
      expect(whatsappService.sendMessage).toHaveBeenCalledWith(
        '5511999999999',
        'Hello, this is a test message',
      );
      expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      whatsappService.sendMessage.mockRejectedValue(new Error('boom'));

      await expect(
        controller.sendMessage({ to: '1', message: 'x' }),
      ).rejects.toThrow('boom');
    });
  });
});
