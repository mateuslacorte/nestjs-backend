import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUser } from '../interfaces/user.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserMongoRepository {

    constructor(
        // @ts-ignore
        @InjectModel(User.name) private userModel: Model<User>,
        private configService: ConfigService,
    ) {}


    async create(createUserDto: CreateUserDto, includePassword = false): Promise<IUser> {
        const { username, email, password } = createUserDto;

        // Check if the user already exists
        const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        // Hash the password
        const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userId = uuidv4();
        // Create and save the new user
        const newUser = new this.userModel({
            ...createUserDto,
            _id: userId, // Use UUID as the MongoDB _id
            id: userId, // Store UUID as a separate field
            password: hashedPassword,
        });

        await newUser.save();

        // Return the user data excluding password
        return includePassword ? newUser.toObject() : this.omitPassword(newUser);
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

    async update(id: string, updateUserDto: Partial<IUser>, shouldOmitPassword: boolean = true): Promise<IUser> {
        // If password is provided and is not already hashed, hash it
        if (updateUserDto.password && !this.isAlreadyHashed(updateUserDto.password)) {
            const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 10;
            const hashedPassword = await bcrypt.hash(
                updateUserDto.password,
                saltRounds,
            );
            updateUserDto.password = hashedPassword;
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

        return shouldOmitPassword ? this.omitPassword(updatedUser) : updatedUser.toObject() as IUser;
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
        const { password, ...userWithoutPassword } = user.toObject();
        return {
            ...userWithoutPassword,
        } as IUser;
    }

    // Helper method to check if a password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    private isAlreadyHashed(password: string): boolean {
        return /^\$2[aby]\$\d+\$/.test(password);
    }
}
