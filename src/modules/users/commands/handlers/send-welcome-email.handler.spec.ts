import { SendWelcomeEmailHandler } from './send-welcome-email.handler';
import { SendWelcomeEmailCommand } from '../send-welcome-email.command';

describe('SendWelcomeEmailHandler', () => {
  let handler: SendWelcomeEmailHandler;
  let emailService: { sendWelcomeEmail: jest.Mock };

  beforeEach(() => {
    emailService = { sendWelcomeEmail: jest.fn().mockResolvedValue(undefined) };
    handler = new SendWelcomeEmailHandler(emailService as any);
  });

  it('calls emailService.sendWelcomeEmail with userId and email', async () => {
    const command = new SendWelcomeEmailCommand('user-1', 'test@example.com', 'op-1');

    await handler.execute(command);

    expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('user-1', 'test@example.com');
  });

  it('propagates errors from emailService', async () => {
    emailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP failure'));
    const command = new SendWelcomeEmailCommand('user-1', 'test@example.com', 'op-1');

    await expect(handler.execute(command)).rejects.toThrow('SMTP failure');
  });
});
