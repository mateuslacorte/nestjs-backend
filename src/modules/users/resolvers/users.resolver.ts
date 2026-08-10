import { Resolver, Query, Args, Mutation, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserModel, UsersPageModel } from '../models/users.model';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwtauth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
import { Audit } from '@common/audit/decorators/audit.decorator';

@Resolver(() => UserModel)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersResolver {
    constructor(private readonly usersService: UsersService) {}

    /**
     * Search users with cursor pagination
     */
    @Query(() => UsersPageModel)
    @Roles(Role.SUPER)
    async users(
        @Args('cursor', { nullable: true }) cursor?: string,
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
        @Args('q', { nullable: true }) q?: string,
        @Args('isActive', { nullable: true }) isActive?: boolean,
    ): Promise<UsersPageModel> {
        return this.usersService.search({ cursor, limit, q, isActive });
    }

    /**
     * Get a user by ID
     * @param id - The ID of the user to get
     * @returns The user
     */
    @Query(() => UserModel, { nullable: true })
    @Roles(Role.SUPER)
    async user(@Args('id') id: string): Promise<UserModel | null> {
        return this.usersService.findById(id);
    }

    /**
     * Get a user by email
     * @param email - The email of the user to get
     * @returns The user
     */
    @Query(() => UserModel, { nullable: true })
    @Roles(Role.SUPER)
    async userByEmail(@Args('email') email: string): Promise<UserModel | null> {
        return this.usersService.findByEmail(email);
    }

    /**
     * Create a user
     * @param userData - The data of the user to create
     * @returns The created user
     */
    @Mutation(() => UserModel)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.create',
        category: 'user',
        description: 'Create user (admin, GraphQL)',
        identifierFrom: 'email',
        userIdFrom: 'id',
    })
    async createUser(@Args('userData') userData: CreateUserDto): Promise<UserModel> {
        return this.usersService.create(userData);
    }

    /**
     * Update a user
     * @param id - The ID of the user to update
     * @param userData - The data of the user to update
     * @returns The updated user
     */
    @Mutation(() => UserModel)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.update',
        category: 'user',
        description: 'Update user (admin, GraphQL)',
        userIdFrom: 'id',
        userIdParam: 'id',
    })
    async updateUser(
        @Args('id') id: string,
        @Args('userData') userData: UpdateUserDto
    ): Promise<UserModel> {
        return this.usersService.update(id, userData);
    }

    /**
     * Remove a user
     * @param id - The ID of the user to remove
     * @returns The removed user
     */
    @Mutation(() => UserModel)
    @Roles(Role.SUPER)
    @Audit({
        action: 'user.delete',
        category: 'user',
        description: 'Delete user (admin, GraphQL)',
        userIdFrom: 'id',
        userIdParam: 'id',
    })
    async removeUser(@Args('id') id: string): Promise<UserModel> {
        return this.usersService.remove(id);
    }
}
