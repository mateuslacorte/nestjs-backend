import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import {APP_GUARD} from "@nestjs/core";
import {JwtAuthGuard} from "@modules/auth/guards/jwtauth.guard";
import {RolesGuard} from "@modules/auth/guards/roles.guard";

@Module({
  imports: [],
  controllers: [WhatsappController],
  providers: [
      WhatsappService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {} // Fixed the module name from EmailModule to WhatsappModule