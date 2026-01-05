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
            title: 'Backend - Documentação da API',
            currentPage: 'home'
        };
    }

    @Get('architecture')
    @Render('pages/architecture')
    getArchitecture() {
        return {
            title: 'Arquitetura - Backend NestJS',
            currentPage: 'architecture'
        };
    }

    @Get('backend')
    @Render('pages/backend')
    getBackend() {
        return {
            title: 'Guia Backend - Backend NestJS',
            currentPage: 'backend-guide'
        };
    }

    @Get('auth')
    @Render('pages/auth')
    getAuth() {
        return {
            title: 'Autenticação JWT - Backend NestJS',
            currentPage: 'auth'
        };
    }
    // Serve static files
    @Get('static/*')
    serveStatic(@Param('0') filePath: string, @Res() res: Response) {
        const fullPath = path.join(__dirname, 'public', filePath);
        return res.sendFile(fullPath);
    }
}
