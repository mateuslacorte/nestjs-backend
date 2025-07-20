import {IUser} from "@modules/users/interfaces/user.interface";
import {UserPostgresRepository} from "@modules/users/repositories/postgres.repository";
import { UserMongoRepository } from "@modules/users/repositories/mongo.repository";
import {Injectable} from "@nestjs/common";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
      private readonly mongoRepo: UserMongoRepository,
      private readonly postgresRepo: UserPostgresRepository
  ) {}

  /**
   * Create a new user and synchronize with PostgreSQL
   * @param userData - User data to create
   * @returns The created user
   */
  async create(userData: CreateUserDto): Promise<IUser> {
    const user = await this.mongoRepo.create(userData, true);
    await this.postgresRepo.upsert(user);
    return user;
  }

  /**
   * Find all users
   * @returns List of users or null if none found
   */
  async findAll(): Promise<IUser[] | null> {
    return this.postgresRepo.findAll();
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @returns The user or null if not found
   */
  async findById(id: string): Promise<IUser | null> {
    return this.postgresRepo.findById(id);
  }

  /**
   * Find a user by email
   * @param email - User's email
   * @returns The user or null if not found
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmail(email);
  }

  /**
   * Find a user by email verification token
   * @param token - User's email verification token
   * @returns The user or null if not found
   */
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmailVerificationToken(token);
  }

  /**
   * Find a user by password reset token
   * @param token - User's password reset token
   * @returns The user or null if not found
   */
  async findByPasswordToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByPasswordToken(token);
  }

  /**
   * Update a user by ID
   * @param id - User's ID
   * @returns The updated user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    const updatedUser = await this.mongoRepo.update(id, updateUserDto);
    await this.postgresRepo.upsert(updatedUser);
    return updatedUser;
  }

  /**
   * Remove a user by ID
   * @param id
   * @returns The removed user
   */
  async remove(id: string): Promise<IUser> {
    const removedUser = await this.mongoRepo.remove(id);
    // TODO: Consider how to handle deletion in PostgreSQL
    return removedUser;
  }

  /**
   * Update the user's password reset token and expiration
   * @param userId
   * @param resetData
   */
  async updateResetToken(userId: string | undefined, resetData: {
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    const updatedUser = await this.mongoRepo.update(userId!, resetData);
    await this.postgresRepo.upsert(updatedUser);
  }

  /**
   * Update the user's password
   * @param userId
   * @param passwordData
   */
  async updatePassword(userId: string, passwordData: {
    password: string;
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    const updatedUser = await this.mongoRepo.update(userId, passwordData);
    await this.postgresRepo.upsert(updatedUser);
  }

  /**
   * Synchronize a user from MongoDB to PostgreSQL
   * @param userId - User ID to synchronize
   */
  async syncUser(userId: string): Promise<void> {
    const user = await this.mongoRepo.findById(userId);
    if (user) {
      await this.postgresRepo.upsert(user);
    }
  }
}
