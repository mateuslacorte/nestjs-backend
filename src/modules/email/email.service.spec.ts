import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let mailerService: { sendMail: jest.Mock };
  let service: EmailService;

  beforeEach(() => {
    mailerService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    service = new EmailService(mailerService as unknown as MailerService);
  });

  describe('sendMail', () => {
    it('forwards options to MailerService.sendMail', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      };

      await service.sendMail(options);

      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailerService.sendMail).toHaveBeenCalledWith(options);
    });

    it('supports template + context options', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Templated',
        template: 'email-confirmation',
        context: { token: 'abc', subject: 'Templated' },
      };

      await service.sendMail(options);

      expect(mailerService.sendMail).toHaveBeenCalledWith(options);
    });

    it('propagates MailerService errors', async () => {
      mailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.sendMail({ to: 'a@b.com', subject: 'x', html: 'y' }),
      ).rejects.toThrow('SMTP down');
    });
  });

  describe('sendEmailConfirmation', () => {
    it('sends confirmation email with template and token context', async () => {
      await service.sendEmailConfirmation('user@example.com', 'confirm-token');

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'E-mail Confirmation',
        template: 'email-confirmation',
        context: {
          subject: 'E-mail Confirmation',
          token: 'confirm-token',
        },
      });
      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('propagates send failures', async () => {
      mailerService.sendMail.mockRejectedValue(new Error('send failed'));

      await expect(
        service.sendEmailConfirmation('user@example.com', 'tok'),
      ).rejects.toThrow('send failed');
    });
  });

  describe('sendPasswordReset', () => {
    it('sends password reset email with template and token context', async () => {
      await service.sendPasswordReset('user@example.com', 'reset-token');

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Password Reset',
        template: 'password-reset',
        context: {
          subject: 'Password Reset',
          token: 'reset-token',
        },
      });
      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('propagates send failures', async () => {
      mailerService.sendMail.mockRejectedValue(new Error('reset failed'));

      await expect(
        service.sendPasswordReset('user@example.com', 'tok'),
      ).rejects.toThrow('reset failed');
    });
  });
});
