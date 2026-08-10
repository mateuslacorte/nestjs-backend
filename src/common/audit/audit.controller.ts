import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER)
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @ApiOperation({
        summary: 'Search audit events (cursor pagination)',
        description:
            'SUPER-only read API. Pass nextCursor from a prior response as cursor for the next page.',
    })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'ip', required: false, type: String })
    @ApiQuery({ name: 'success', required: false, type: Boolean })
    @ApiQuery({ name: 'action', required: false, type: String })
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'provider', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Audit page with nextCursor' })
    @ApiResponse({
        status: 400,
        description: 'Invalid cursor',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions, requires super role.',
    })
    async search(
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Query('q') q?: string,
        @Query('ip') ip?: string,
        @Query('success') success?: string,
        @Query('action') action?: string,
        @Query('category') category?: string,
        @Query('userId') userId?: string,
        @Query('provider') provider?: string,
    ) {
        const parsedLimit = limit ? parseInt(limit, 10) : undefined;
        let parsedSuccess: boolean | undefined;
        if (success === 'true') {
            parsedSuccess = true;
        } else if (success === 'false') {
            parsedSuccess = false;
        }

        return this.auditService.search({
            cursor,
            limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
            q,
            ip,
            success: parsedSuccess,
            action,
            category,
            userId,
            provider,
        });
    }
}
