import { Injectable, NotFoundException, ConflictException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUser } from '../interfaces/user.interface';
import { v4 as uuidv4 } from 'uuid';
import {EnableCache, CacheTTL} from "@common/cache/decorators/cache.decorator";
import {CacheService} from "@common/cache/cache.service";
import { hashPassword, isPasswordHashed } from '@common/crypto/password.util';

@Injectable()
export class UserMongoRepository {

    constructor(
        // @ts-ignore
        @InjectModel(User.name) private userModel: Model<User>,
        @Optional()
        private cacheService?: CacheService
    ) {}

    /**
     * Create a new user in the MongoDB database
     * @param createUserDto - User data to create
     * @param includePassword - Whether to return the password hash
     * @returns The created user
     */
    @EnableCache()
    async create(createUserDto: CreateUserDto, includePassword = false): Promise<IUser> {
        const { username, email, password, googleId, facebookId, twitterId } = createUserDto;
        
        const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        const hashedPassword = password
            ? await hashPassword(password)
            : null;
        const userId = uuidv4();

        const newUser = new this.userModel({
            ...createUserDto,
            _id: userId, 
            id: userId, 
            password: hashedPassword,
            googleId: googleId ?? null,
            facebookId: facebookId ?? null,
            twitterId: twitterId ?? null,
        });

        await newUser.save();
        this.cacheService?.delPattern("users:*");
        return includePassword ? newUser.toObject() : this.omitPassword(newUser);
    }

    /**
     * Find all users in the MongoDB database
     * @returns All users
     */
    @EnableCache()
    async findAll(): Promise<IUser[]> {
        const users = await this.userModel.find();
        return users.map(user => this.omitPassword(user));
    }

    /**
     * Find a user by their ID
     * @param id - The ID of the user to find
     * @returns The user
     */
    @EnableCache()
    async findById(id: string) {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return this.omitPassword(user);
    }

    /**
     * Update a user in the MongoDB database
     * @param id - The ID of the user to update
     * @param updateUserDto - The user data to update
     * @param shouldOmitPassword - Whether to omit the password from the user data
     * @returns The updated user
     */
    @EnableCache()
    async update(id: string, updateUserDto: Partial<IUser>, shouldOmitPassword: boolean = true): Promise<IUser> {
        if (updateUserDto.password && !isPasswordHashed(updateUserDto.password)) {
            updateUserDto.password = await hashPassword(updateUserDto.password);
        }

        if (updateUserDto.username || updateUserDto.email) {
            const query: any = { _id: { $ne: id } };
            if (updateUserDto.username) query.username = updateUserDto.username;
            if (updateUserDto.email) query.email = updateUserDto.email;

            const existingUser = await this.userModel.findOne(query);
            if (existingUser) {
                throw new ConflictException('Username or email already in use');
            }
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            updateUserDto,
            { new: true },
        );

        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        this.cacheService?.delPattern("users:*");
        return shouldOmitPassword ? this.omitPassword(updatedUser) : updatedUser.toObject() as IUser;
    }

    /**
     * Remove a user from the MongoDB database
     * @param id - The ID of the user to remove
     * @returns The removed user
     */
    @EnableCache()
    async remove(id: string): Promise<IUser> {
        const deletedUser = await this.userModel.findByIdAndDelete(id);
        if (!deletedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        this.cacheService?.delPattern("users:*");
        return this.omitPassword(deletedUser);
    }

    private omitPassword(user: User): IUser {
        const { password, ...userWithoutPassword } = user.toObject();
        return {
            ...userWithoutPassword,
        } as IUser;
    }
}
