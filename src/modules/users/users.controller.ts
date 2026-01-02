import { Body, Controller, Get, Param, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super')
    @ApiOperation({
        summary: 'Create a new user',
        description: 'Creates a new user in the system. Requires super or admin role.'
    })
    @ApiBody({
        type: CreateUserDto,
        description: 'User data to create'
    })
    @ApiResponse({ status: 201, description: 'User successfully created.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super or admin role.' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super')
    @ApiOperation({
        summary: 'Get all users',
        description: 'Retrieves a list of all users. Requires super or admin role.'
    })
    @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super or admin role.' })
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super')
    @ApiOperation({
        summary: 'Get a user by ID',
        description: 'Retrieves a specific user by their ID. Accessible by super, admin, or user roles.'
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

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super', 'manager', 'provider')
    @ApiOperation({
        summary: 'Update a user by ID',
        description: 'Updates a specific user by their ID. Requires super or admin role.'
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
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super or admin role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('super')
    @ApiOperation({
        summary: 'Delete a user by ID',
        description: 'Deletes a specific user by their ID. Requires super or admin role.'
    })
    @ApiParam({
        name: 'id',
        description: 'The ID of the user to delete',
        required: true
    })
    @ApiResponse({ status: 200, description: 'User deleted successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token is missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super or admin role.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}