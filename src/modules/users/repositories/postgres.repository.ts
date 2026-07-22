import {InjectRepository} from "@nestjs/typeorm";
import {ConflictException, Injectable, NotFoundException, Optional} from "@nestjs/common";
import {UserEntity} from "@modules/users/entities/user.entity";
import {FindOptionsWhere, Not, Repository} from "typeorm";
import {IUser} from "@modules/users/interfaces/user.interface";
import {EnableCache, NoCache} from "@common/cache/decorators/cache.decorator";
import {CacheService} from "@common/cache/cache.service";
import {CreateUserDto} from "../dtos/create-user.dto";
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserPostgresRepository {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @Optional()
        private cacheService?: CacheService
    ) {}

    /**
     * Create a new user in the PostgreSQL database
     * @param createUserDto - User data to create
     * @param includePassword - Whether to return the password hash
     * @returns The created user
     */
    @EnableCache()
    async create(createUserDto: CreateUserDto, includePassword = false): Promise<IUser> {
        const { username, email, password } = createUserDto;

        const existingUser = await this.userRepository.findOne({
            where: [{ email }, { username }],
        });
        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_HASH_FACTOR));
        const newUser = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
            isActive: createUserDto.isActive ?? true,
            roles: createUserDto.roles ?? [],
        });

        const savedUser = await this.userRepository.save(newUser);
        this.cacheService?.delPattern("users:*");

        return includePassword ? savedUser : this.omitPassword(savedUser);
    }

    /**
     * Find all users in the PostgreSQL database
     * @returns Array of IUser or null if no users found
     */
    @EnableCache()
    async findAll(): Promise<IUser[] | null> {
        const users = await this.userRepository.find({});
        return users.map((user) => this.omitPassword(user));
    }

    /**
     * Find a user by ID
     * @param id - The user ID
     * @param includePassword - Whether to return the password hash
     * @returns The user or null if not found
     */
    @EnableCache()
    async findById(id: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by email
     * @param email - The user's email
     * @param includePassword - Whether to return the password hash
     * @returns The user or null if not found
     */
    @NoCache()
    async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by email verification token
     * @param token - The email verification token
     * @returns The user or null if not found
     */
    @NoCache()
    async findByEmailVerificationToken(token: string): Promise<IUser | null> {
        const user = await this.userRepository.findOne({
            where: { emailVerificationToken: token }
        });
        return user ? this.omitPassword(user) : null;
    }

    /**
     * Find a user by password reset token
     * @param token - The password reset token
     * @returns The user or null if not found
     */
    @NoCache()
    async findByPasswordToken(token: string): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { passwordResetToken: token } });
        return user ? this.omitPassword(user) : null;
    }

    /**
     * Update a user by ID
     * @param id - User ID
     * @param updateUserDto - Fields to update
     * @param shouldOmitPassword - Whether to omit password from the returned user
     * @returns The updated user
     */
    @EnableCache()
    async update(id: string, updateUserDto: Partial<IUser>, shouldOmitPassword = true): Promise<IUser> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (updateUserDto.password && !this.isAlreadyHashed(updateUserDto.password)) {
            updateUserDto.password = await bcrypt.hash(
                updateUserDto.password,
                Number(process.env.BCRYPT_HASH_FACTOR),
            );
        }

        if (updateUserDto.username || updateUserDto.email) {
            const conflicts: FindOptionsWhere<UserEntity>[] = [];
            if (updateUserDto.username) {
                conflicts.push({ username: updateUserDto.username, id: Not(id) });
            }
            if (updateUserDto.email) {
                conflicts.push({ email: updateUserDto.email, id: Not(id) });
            }

            const existingUser = await this.userRepository.findOne({ where: conflicts });
            if (existingUser) {
                throw new ConflictException('Username or email already in use');
            }
        }

        Object.assign(user, updateUserDto);
        const updatedUser = await this.userRepository.save(user);
        this.cacheService?.delPattern("users:*");

        return shouldOmitPassword ? this.omitPassword(updatedUser) : updatedUser;
    }

    /**
     * Remove a user by ID
     * @param id - User ID
     * @returns The removed user
     */
    @EnableCache()
    async remove(id: string): Promise<IUser> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        await this.userRepository.remove(user);
        this.cacheService?.delPattern("users:*");

        return this.omitPassword(user);
    }

    /**
     * Upsert a user in the PostgreSQL database
     * @param userData - The user data to upsert
     * @returns The created or updated user
     */
    @EnableCache()
    async upsert(userData: IUser): Promise<IUser> {
        let user: UserEntity | null = null;

        if (userData.id) {
            user = await this.userRepository.findOne({ where: { id: userData.id } });
        }

        if (!user && userData.email) {
            user = await this.userRepository.findOne({ where: { email: userData.email } });
        }

        if (user) {
            const dataToUpdate = userData.password
                ? userData
                : (({ password, ...rest }) => rest)(userData);

            Object.assign(user, dataToUpdate);
            const userSaved = await this.userRepository.save(user);
            this.cacheService?.delPattern("users:*");
            return this.omitPassword(userSaved);
        } else {
            if (!userData.password) {
                throw new Error('Password is required for new users');
            }
            const newUser = this.userRepository.create(userData);
            const newUserSaved = await this.userRepository.save(newUser);
            this.cacheService?.delPattern("users:*");
            return this.omitPassword(newUserSaved);
        }
    }

    private omitPassword(user: UserEntity): IUser {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
    }

    private isAlreadyHashed(password: string): boolean {
        return /^\$2[aby]\$\d+\$/.test(password);
    }
}
