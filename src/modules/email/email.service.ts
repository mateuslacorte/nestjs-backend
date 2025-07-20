import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

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