import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserSchema } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { IUser } from '../interfaces/user.interface';

@Injectable()
export class UserMongoRepository {

    constructor(
        // @ts-ignore
        @InjectModel(User.name) private userModel: Model<User>
    ) {}


    async create(createUserDto: CreateUserDto): Promise<IUser> {
        const { username, email, password } = createUserDto;

        // Check if the user already exists
        const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_HASH_FACTOR));

        // Create and save the new user
        const newUser = new this.userModel({
            ...createUserDto,
            password: hashedPassword,
        });
        await newUser.save();

        // Return the user data excluding password
        return this.omitPassword(newUser);
    }

    async findAll(): Promise<IUser[]> {
        const users = await this.userModel.find();
        return users.map(user => this.omitPassword(user));
    }

    async findById(id: string) {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return this.omitPassword(user);
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
        // If password is provided, hash it
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(
                updateUserDto.password,
                Number(process.env.BCRYPT_HASH_FACTOR),
            );
        }

        // Check if username or email is being updated and if they already exist
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

        return this.omitPassword(updatedUser);
    }

    async remove(id: string): Promise<IUser> {
        const deletedUser = await this.userModel.findByIdAndDelete(id);
        if (!deletedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return this.omitPassword(deletedUser);
    }

    // Helper method to omit password from user data
    private omitPassword(user: User): IUser {
        const { password, _id, ...userWithoutPassword } = user.toObject();
        return {
            ...userWithoutPassword,
            // @ts-ignore
            id: _id.toString(),
        } as IUser;
    }
}
