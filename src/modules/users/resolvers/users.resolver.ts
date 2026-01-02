import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UserModel } from '../models/users.model';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Resolver(() => UserModel)
export class UsersResolver {
    constructor(private readonly usersService: UsersService) {}

    @Query(() => [UserModel], { nullable: true })
    async users(): Promise<UserModel[] | null> {
        return this.usersService.findAll();
    }

    @Query(() => UserModel, { nullable: true })
    async user(@Args('id') id: string): Promise<UserModel | null> {
        return this.usersService.findById(id);
    }

    @Query(() => UserModel, { nullable: true })
    async userByEmail(@Args('email') email: string): Promise<UserModel | null> {
        return this.usersService.findByEmail(email);
    }

    @Mutation(() => UserModel)
    async createUser(@Args('userData') userData: CreateUserDto): Promise<UserModel> {
        return this.usersService.create(userData);
    }

    @Mutation(() => UserModel)
    async updateUser(
        @Args('id') id: string,
        @Args('userData') userData: UpdateUserDto
    ): Promise<UserModel> {
        return this.usersService.update(id, userData);
    }

    @Mutation(() => UserModel)
    async removeUser(@Args('id') id: string): Promise<UserModel> {
        return this.usersService.remove(id);
    }
}