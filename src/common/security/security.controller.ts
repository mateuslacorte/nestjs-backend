import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';

@ApiTags('Security')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER)
@Controller('security')
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @Get('blocked-ips')
    @ApiOperation({ summary: 'List all blocked IPs' })
    @ApiResponse({ status: 200, description: 'List of blocked IPs' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    async getBlockedIps() {
        return this.securityService.getBlockedIps();
    }

    @Get('suspicious-ips')
    @ApiOperation({ summary: 'List suspicious IPs (attempts recorded but not blocked)' })
    @ApiResponse({ status: 200, description: 'List of suspicious IPs' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    async getSuspiciousIps() {
        return this.securityService.getSuspiciousIps();
    }

    @Post('unblock/:ip')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Unblock an IP' })
    @ApiParam({ name: 'ip', description: 'IP address to unblock' })
    @ApiResponse({ status: 200, description: 'IP unblocked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'IP not found' })
    async unblockIp(@Param('ip') ip: string) {
        const result = await this.securityService.unblockIp(ip);
        return { message: `IP ${ip} desbloqueado com sucesso`, data: result };
    }

    @Post('reset/:ip')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset attempts for an IP' })
    @ApiParam({ name: 'ip', description: 'IP address to reset' })
    @ApiResponse({ status: 200, description: 'Attempts reset' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'IP not found' })
    async resetAttempts(@Param('ip') ip: string) {
        const result = await this.securityService.resetAttempts(ip);
        return { message: `Tentativas do IP ${ip} resetadas`, data: result };
    }

    @Delete(':ip')
    @ApiOperation({ summary: 'Remove an IP from the list' })
    @ApiParam({ name: 'ip', description: 'IP address to remove' })
    @ApiResponse({ status: 200, description: 'IP removed' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'IP not found' })
    async removeIp(@Param('ip') ip: string) {
        await this.securityService.removeIp(ip);
        return { message: `IP ${ip} removido da lista com sucesso` };
    }
}
