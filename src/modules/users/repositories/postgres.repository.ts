import {InjectRepository} from "@nestjs/typeorm";
import {Injectable} from "@nestjs/common";
import {UserEntity} from "@modules/users/entities/user.entity";
import {Repository} from "typeorm";
import {IUser} from "@modules/users/interfaces/user.interface";

@Injectable()
export class UserPostgresRepository {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>
    ) {}

    /**
     * Find all users in the PostgreSQL database
     * @returns Array of IUser or null if no users found
     */
    async findAll(): Promise<UserEntity[] | null> {
        return this.userRepository.find({});
    }

    /**
     * Find a user by ID
     * @param id - The user ID
     * @returns The user or null if not found
     */
    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    /**
     * Find a user by email
     * @param email - The user's email
     * @returns The user or null if not found
     */
    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    /**
     * Find a user by email verification token
     * @param token - The email verification token
     * @returns The user or null if not found
     */
    async findByEmailVerificationToken(token: string): Promise<IUser | null> {
        // Implementation depends on your database structure
        // Example with TypeORM:
        const user = await this.userRepository.findOne({
            where: { emailVerificationToken: token }
        });
        return user || null;
    }

    /**
     * Find a user by password reset token
     * @param token - The password reset token
     * @returns The user or null if not found
     */
    async findByPasswordToken(token: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: {passwordResetToken: token } });
    }

    /**
     * Upsert a user in the PostgreSQL database
     * @param userData - The user data to upsert
     * @returns The created or updated user
     */
    async upsert(userData: IUser): Promise<UserEntity> {
        let user: UserEntity | null = null;

        if (userData.id) {
            user = await this.userRepository.findOne({ where: { id: userData.id } });
        }

        if (!user && userData.email) {
            user = await this.userRepository.findOne({ where: { email: userData.email } });
        }

        if (user) {
            // Update existing user, but don't overwrite password if it's missing
            const { password, ...dataToUpdate } = userData;
            Object.assign(user, dataToUpdate);
            return this.userRepository.save(user);
        } else {
            console.log('Creating new user', userData);
            // For new users, password is required
            if (!userData.password) {
                throw new Error('Password is required for new users');
            }
            const newUser = this.userRepository.create(userData);
            return this.userRepository.save(newUser);
        }
    }
}
