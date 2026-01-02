import { Controller, Get, Render, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import { Public } from '../modules/auth/decorators/public.decorator';
import { NoLog } from '@common/logtail/decorators/no-log.decorator';

@ApiExcludeController()
@NoLog()
@Public()
@Controller('wiki')
export class WikiController {
    
    @Get()
    @Render('pages/home')
    getHome() {
        return {
            title: 'AtalaHub - Documentação da API',
            currentPage: 'home'
        };
    }
    // Serve static files
    @Get('static/*')
    serveStatic(@Param('0') filePath: string, @Res() res: Response) {
        const fullPath = path.join(__dirname, 'public', filePath);
        return res.sendFile(fullPath);
    }
}
