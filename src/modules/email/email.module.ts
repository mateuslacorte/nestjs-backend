import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import {EmailController} from "@modules/email/email.controller";
import {APP_GUARD} from "@nestjs/core";
import {JwtAuthGuard} from "@modules/auth/guards/jwtauth.guard";
import {RolesGuard} from "@modules/auth/guards/roles.guard";

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const auth = configService.get<{ user: string; pass: string } | undefined>('smtp.auth');
        return {
          transport: {
            host: configService.get<string>('smtp.host'),
            port: configService.get<number>('smtp.port'),
            secure: configService.get<boolean>('smtp.secure'),
            requireTLS: configService.get<boolean>('smtp.requireTLS'),
            ...(auth ? { auth } : {}),
          },
          defaults: {
            from: configService.get<string>('smtp.from'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ]
  ,
  exports: [EmailService],
})
export class EmailModule {}