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

    await this.mailerService.sendMail({
      to: email,
      subject: 'Confirmação de E-mail - Backend NestJS',
      html: `
        <h3>Confirmação de E-mail</h3>
        <p>Obrigado por se registrar!</p>
        <p>Por favor, insira o código abaixo para confirmar seu endereço de e-mail:</p>
        <strong style="font-size: 24px; letter-spacing: 4px; color: #2563eb;">${token}</strong>
        <p>Este código expira em 24 horas.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Se você não se registrou nesta plataforma, por favor ignore este e-mail.</p>
      `,
    });
  }

  /**
   * Send a password reset email to the user
   * @param email
   * @param token
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperação de Senha - Backend NestJS',
      html: `
        <h3>Recuperação de Senha</h3>
        <p>Você solicitou a recuperação de senha.</p>
        <p>Use o código abaixo para redefinir sua senha:</p>
        <strong style="font-size: 24px; letter-spacing: 4px; color: #2563eb;">${token}</strong>
        <p>Este código expira em 1 hora.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Se você não solicitou a recuperação de senha, por favor ignore este e-mail.</p>
      `,
    });
  }
}