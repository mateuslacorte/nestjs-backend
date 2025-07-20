import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send an email confirmation to the user
   * @param email
   * @param token
   */
  async sendEmailConfirmation(email: string, token: string): Promise<void> {
    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Email Confirmation',
      html: `
        <h3>Email Confirmation</h3>
        <p>Thank you for registering!</p>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmUrl}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  /**
   * Send a password reset email to the user
   * @param email
   * @param token
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Recovery',
      html: `
        <h3>Password Recovery</h3>
        <p>You have requested a password reset.</p>
        <p>Click on the link bellow to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>Please ignore this e-mail if you didn't request a password reset.</p>
      `,
    });
  }
}