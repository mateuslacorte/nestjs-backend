import { Body, Controller, Get, Param, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User successfully created.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiResponse({ status: 200, description: 'User updated successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Delete a user by ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
