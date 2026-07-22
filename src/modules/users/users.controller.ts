import { Body, Controller, Get, Param, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';

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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Create a new user',
        description: 'Creates a new user in the system. Requires the super role.',
    })
    @ApiBody({
        type: CreateUserDto,
        description: 'User data to create'
    })
    @ApiResponse({ status: 201, description: 'User successfully created.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    /**
     * Get all users
     * @returns All users
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Get all users',
        description: 'Retrieves a list of all users. Requires the super role.',
    })
    @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    findAll() {
        return this.usersService.findAll();
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
    findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    /**
     * Update a user by ID
     * @param id - The ID of the user to update
     * @param updateUserDto - The user data to update
     * @returns The updated user
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Update a user by ID',
        description: 'Updates a specific user by their ID. Requires the super role.',
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to update',
        required: true
    })
    @ApiBody({
        type: UpdateUserDto,
        description: 'User data to update'
    })
    @ApiResponse({ status: 200, description: 'User updated successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    /**
     * Delete a user by ID
     * @param id - The ID of the user to delete
     * @returns The deleted user
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiOperation({
        summary: 'Delete a user by ID',
        description: 'Deletes a specific user by their ID. Requires the super role.',
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to delete',
        required: true
    })
    @ApiResponse({ status: 200, description: 'User deleted successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
