import { Module } from '@nestjs/common';
import { WikiController } from './wiki.controller';
import { WikiI18nService } from './i18n/wiki-i18n.service';
import { WikiRenderService } from './wiki-render.service';

@Module({
    controllers: [WikiController],
    providers: [WikiI18nService, WikiRenderService],
    exports: [WikiI18nService, WikiRenderService],
})
export class WikiModule {}
