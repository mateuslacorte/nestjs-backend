import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendWelcomeEmailCommand } from '../send-welcome-email.command';
import { EmailService } from '@modules/email/email.service';

@CommandHandler(SendWelcomeEmailCommand)
export class SendWelcomeEmailHandler implements ICommandHandler<SendWelcomeEmailCommand> {

  constructor(private readonly emailService: EmailService) {}

  async execute(command: SendWelcomeEmailCommand): Promise<void> {
    console.debug(`Sending welcome email to user ${command.userId}`);
    await this.emailService.sendWelcomeEmail(command.userId, command.email);
  }
}
