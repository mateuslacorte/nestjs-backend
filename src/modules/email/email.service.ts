import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send a generic email
   * @param options Mail options including to, subject, and html content
   */
  async sendMail(options: any): Promise<void> {
    await this.mailerService.sendMail(options);
  }

  /**
   * Send an email confirmation to the user
   * @param email
   * @param token
   */
  async sendEmailConfirmation(email: string, token: string): Promise<void> {
    try {
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'E-mail Confirmation',
        html: `
          <h3>E-mail Confirmation</h3>
          <p>Thank you for registering!</p>
          <p>Please enter the code below to confirm your email address:</p>
          <strong style="font-size: 24px; letter-spacing: 4px; color: #2563eb;">${token}</strong>
          <p>This code expires in 24 hours.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">If you did not register on this platform, please ignore this email.</p>
        `,
      });
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Send a password reset email to the user
   * @param email
   * @param token
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset',
      html: `
        <h3>Password Reset</h3>
        <p>You requested a password reset.</p>
        <p>Use the code below to reset your password:</p>
        <strong style="font-size: 24px; letter-spacing: 4px; color: #2563eb;">${token}</strong>
        <p>This code expires in 1 hour.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">If you did not request a password reset, please ignore this email.</p>
      `,
    });
  }
}