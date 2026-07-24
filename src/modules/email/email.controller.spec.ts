import {
  PATH_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SendEmailDto } from './dtos/send-email.dto';

describe('EmailController', () => {
  let emailService: { sendMail: jest.Mock };
  let controller: EmailController;

  beforeEach(() => {
    emailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    controller = new EmailController(
      emailService as unknown as EmailService,
    );
  });

  describe('routing metadata', () => {
    it('is mounted at /email', () => {
      expect(Reflect.getMetadata(PATH_METADATA, EmailController)).toBe('email');
    });

    it('exposes POST /send', () => {
      expect(
        Reflect.getMetadata(PATH_METADATA, EmailController.prototype.sendEmail),
      ).toBe('send');
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          EmailController.prototype.sendEmail,
        ),
      ).toBe(RequestMethod.POST);
    });

    it('returns HTTP 200', () => {
      // @HttpCode stores status via Reflect metadata under `__httpCode__` in Nest
      // Prefer asserting via Nest's HTTP_CODE_METADATA when available.
      const HTTP_CODE_METADATA = '__httpCode__';
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          EmailController.prototype.sendEmail,
        ),
      ).toBe(HttpStatus.OK);
    });
  });

  describe('guards and roles', () => {
    const reflector = new Reflector();

    it('requires JwtAuthGuard and RolesGuard on sendEmail', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        EmailController.prototype.sendEmail,
      ) as unknown[];

      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
      expect(guards).toHaveLength(2);
    });

    it('requires SUPER role', () => {
      expect(
        reflector.get(ROLES_KEY, EmailController.prototype.sendEmail),
      ).toEqual([Role.SUPER]);
    });
  });

  describe('sendEmail', () => {
    it('delegates to EmailService.sendMail and returns success payload', async () => {
      const dto: SendEmailDto = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>',
      };

      await expect(controller.sendEmail(dto)).resolves.toEqual({
        message: 'Email sent successfully',
      });
      expect(emailService.sendMail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>',
      });
      expect(emailService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('does not pass unexpected dto fields to the mailer', async () => {
      const dto = {
        to: 'a@b.com',
        subject: 'Subj',
        html: '<p>x</p>',
        extra: 'should-not-leak',
      } as SendEmailDto & { extra: string };

      await controller.sendEmail(dto);

      expect(emailService.sendMail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Subj',
        html: '<p>x</p>',
      });
    });

    it('propagates EmailService errors', async () => {
      emailService.sendMail.mockRejectedValue(new Error('SMTP unavailable'));

      await expect(
        controller.sendEmail({
          to: 'a@b.com',
          subject: 'x',
          html: 'y',
        }),
      ).rejects.toThrow('SMTP unavailable');
    });
  });
});
