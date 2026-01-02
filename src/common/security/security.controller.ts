import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('security')
@ApiBearerAuth()
@Controller('security')
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @Get('blocked-ips')
    @Roles('super', 'admin')
    @ApiOperation({ summary: 'Listar todos os IPs bloqueados' })
    @ApiResponse({ status: 200, description: 'Lista de IPs bloqueados' })
    async getBlockedIps() {
        return this.securityService.getBlockedIps();
    }

    @Get('suspicious-ips')
    @Roles('super', 'admin')
    @ApiOperation({ summary: 'Listar IPs suspeitos (com tentativas mas não bloqueados)' })
    @ApiResponse({ status: 200, description: 'Lista de IPs suspeitos' })
    async getSuspiciousIps() {
        return this.securityService.getSuspiciousIps();
    }

    @Post('unblock/:ip')
    @Roles('super', 'admin')
    @ApiOperation({ summary: 'Desbloquear um IP' })
    @ApiParam({ name: 'ip', description: 'Endereço IP a desbloquear' })
    @ApiResponse({ status: 200, description: 'IP desbloqueado' })
    @ApiResponse({ status: 404, description: 'IP não encontrado' })
    async unblockIp(@Param('ip') ip: string) {
        const result = await this.securityService.unblockIp(ip);
        if (!result) {
            return { message: 'IP não encontrado na lista' };
        }
        return { message: `IP ${ip} desbloqueado com sucesso`, data: result };
    }

    @Post('reset/:ip')
    @Roles('super', 'admin')
    @ApiOperation({ summary: 'Resetar tentativas de um IP' })
    @ApiParam({ name: 'ip', description: 'Endereço IP para resetar' })
    @ApiResponse({ status: 200, description: 'Tentativas resetadas' })
    async resetAttempts(@Param('ip') ip: string) {
        const result = await this.securityService.resetAttempts(ip);
        if (!result) {
            return { message: 'IP não encontrado na lista' };
        }
        return { message: `Tentativas do IP ${ip} resetadas`, data: result };
    }

    @Delete(':ip')
    @Roles('super', 'admin')
    @ApiOperation({ summary: 'Remover um IP da lista' })
    @ApiParam({ name: 'ip', description: 'Endereço IP a remover' })
    @ApiResponse({ status: 200, description: 'IP removido' })
    async removeIp(@Param('ip') ip: string) {
        const removed = await this.securityService.removeIp(ip);
        if (!removed) {
            return { message: 'IP não encontrado na lista' };
        }
        return { message: `IP ${ip} removido da lista com sucesso` };
    }
}
