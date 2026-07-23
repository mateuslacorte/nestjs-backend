import { Injectable } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
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
