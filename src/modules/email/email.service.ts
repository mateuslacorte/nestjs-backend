import { Injectable, Logger } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send a generic email.
   * Supports inline HTML via `html`, or a Pug template via `template` + `context`.
   * When `html` is set, the template adapter is skipped.
   */
  async sendMail(options: ISendMailOptions): Promise<void> {
    await this.mailerService.sendMail(options);
  }

  /**
   * Send an email confirmation to the user (Pug template).
   */
  async sendEmailConfirmation(email: string, token: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'E-mail Confirmation',
      template: 'email-confirmation',
      context: {
        subject: 'E-mail Confirmation',
        token,
      },
    });
  }

  /**
   * Send a welcome email to a newly registered user.
   * Stub: SMTP template not yet wired; logs only until a template is provided.
   */
  async sendWelcomeEmail(userId: string, email: string): Promise<void> {
    this.logger.log(`Welcome email queued for user ${userId} <${email}>`);
  }

  /**
   * Send a password reset email to the user (Pug template).
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset',
      template: 'password-reset',
      context: {
        subject: 'Password Reset',
        token,
      },
    });
  }
}
