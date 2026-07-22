import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserModel } from '../models/users.model';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwtauth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

@Resolver(() => UserModel)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersResolver {
    constructor(private readonly usersService: UsersService) {}

    /**
     * Get all users
     * @returns All users
     */
    @Query(() => [UserModel], { nullable: true })
    @Roles(Role.SUPER)
    async users(): Promise<UserModel[] | null> {
        return this.usersService.findAll();
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
    async removeUser(@Args('id') id: string): Promise<UserModel> {
        return this.usersService.remove(id);
    }
}
