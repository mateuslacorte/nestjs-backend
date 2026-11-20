import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Patch,
    Post,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiResponse,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { sanitizeUserForResponse } from './utils/sanitize-user-response.util';
import { Audit } from '@common/audit/decorators/audit.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    /**
     * Create a new user
     * @param createUserDto - User data to create
     * @returns The created user
     */
    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.create',
        category: 'user',
        description: 'Create user (admin)',
        identifierFrom: 'email',
        userIdFrom: 'id',
    })
    @ApiOperation({
        summary: 'Create a new user',
        description: 'Creates a new user in the system. Requires the super role. Returns 202 Accepted — the write is async; subscribe to the websocket for confirmation.',
    })
    @ApiBody({
        type: CreateUserDto,
        description: 'User data to create',
        examples: {
            createUser: {
                summary: 'Create user example',
                description: 'Sample payload to create a user with the user role',
                value: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    username: 'janesmith',
                    email: 'jane.smith@example.com',
                    password: 'Str0ng!P@ssword',
                    isActive: true,
                    roles: ['user'],
                },
            },
        },
    })
    @ApiResponse({ status: 202, description: 'User creation accepted; processing asynchronously.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 409, description: 'Conflict - email or username already exists.' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    /**
     * Search users with cursor pagination
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Search users (cursor pagination)',
        description:
            'SUPER-only. Pass nextCursor from a prior response as cursor for the next page. Optional q searches email, username, firstName, lastName.',
    })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Users page with nextCursor' })
    @ApiResponse({ status: 400, description: 'Invalid cursor' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    async search(
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Query('q') q?: string,
        @Query('isActive') isActive?: string,
    ) {
        const parsedLimit = limit ? parseInt(limit, 10) : undefined;
        let parsedIsActive: boolean | undefined;
        if (isActive === 'true') {
            parsedIsActive = true;
        } else if (isActive === 'false') {
            parsedIsActive = false;
        }

        const page = await this.usersService.search({
            cursor,
            limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
            q,
            isActive: parsedIsActive,
        });

        return {
            items: page.items.map(sanitizeUserForResponse),
            nextCursor: page.nextCursor,
        };
    }

    /**
     * Get a user by ID
     * @param id - The ID of the user to get
     * @returns The user
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Get a user by ID',
        description: 'Retrieves a specific user by their ID. Requires the super role.',
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to retrieve',
        required: true
    })
    @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async findOne(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) throw new NotFoundException('User not found');
        return sanitizeUserForResponse(user);
    }

    /**
     * Update a user by ID
     * @param id - The ID of the user to update
     * @param updateUserDto - The user data to update
     * @returns The updated user
     */
    @Patch(':id')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.update',
        category: 'user',
        description: 'Update user (admin)',
        userIdFrom: 'id',
        userIdParam: 'id',
    })
    @ApiOperation({
        summary: 'Update a user by ID',
        description: 'Updates a specific user by their ID. Requires the super role. Returns 202 Accepted — the write is async; subscribe to the websocket for confirmation.',
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to update',
        required: true
    })
    @ApiBody({
        type: UpdateUserDto,
        description: 'User data to update',
        examples: {
            updateUser: {
                summary: 'Update user example',
                description: 'Sample partial update for name, active flag, and roles',
                value: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    isActive: true,
                    roles: ['user', 'manager'],
                },
            },
        },
    })
    @ApiResponse({ status: 202, description: 'User update accepted; processing asynchronously.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiResponse({ status: 409, description: 'Conflict - email or username already in use.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    /**
     * Delete a user by ID
     * @param id - The ID of the user to delete
     * @returns The deleted user
     */
    @Delete(':id')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.delete',
        category: 'user',
        description: 'Delete user (admin)',
        userIdFrom: 'id',
        userIdParam: 'id',
    })
    @ApiOperation({
        summary: 'Delete a user by ID',
        description: 'Deletes a specific user by their ID. Requires the super role. Returns 202 Accepted — the write is async; subscribe to the websocket for confirmation.',
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to delete',
        required: true
    })
    @ApiResponse({ status: 202, description: 'User deletion accepted; processing asynchronously.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
