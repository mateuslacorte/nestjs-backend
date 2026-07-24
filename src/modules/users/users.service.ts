import {IUser} from "@modules/users/interfaces/user.interface";
import {UserPostgresRepository} from "@modules/users/repositories/postgres.repository";
import {Injectable} from "@nestjs/common";
import { Role } from "@modules/auth/enums/role.enum";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { CacheTTL, EnableCache, NoCache } from "@common/cache/decorators/cache.decorator";

@Injectable()
export class UsersService {
  constructor(
      private readonly postgresRepo: UserPostgresRepository
  ) {}

  /**
   * Create a new user
   * @param userData - User data to create
   * @returns The created user
   */
  @EnableCache()
  @CacheTTL(1800)
  async create(userData: CreateUserDto): Promise<IUser> {
    return this.postgresRepo.create(userData, true);
  }

  /**
   * Find all users
   * @returns List of users or null if none found
   */
  @EnableCache()
  @CacheTTL(1800)
  async findAll(): Promise<IUser[] | null> {
    return this.postgresRepo.findAll();
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @param includePassword - Whether to return the password hash
   * @returns The user or null if not found
   */
  @NoCache()
  async findById(id: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findById(id, includePassword);
  }

  /**
   * Find a user by email
   * @param email - User's email
   * @param includePassword - Whether to return the password hash
   * @returns The user or null if not found
   */
  @NoCache()
  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByEmail(email, includePassword);
  }

  @NoCache()
  async findByUsername(username: string): Promise<IUser | null> {
    return this.postgresRepo.findByUsername(username);
  }

  /**
   * Find a user by Google subject ID
   */
  @NoCache()
  async findByGoogleId(googleId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGoogleId(googleId, includePassword);
  }

  /**
   * Find a user by Facebook subject ID
   */
  @NoCache()
  async findByFacebookId(facebookId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByFacebookId(facebookId, includePassword);
  }

  /**
   * Find a user by X / Twitter subject ID
   */
  @NoCache()
  async findByTwitterId(twitterId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByTwitterId(twitterId, includePassword);
  }

  /**
   * Find a user by email verification token
   * @param token - User's email verification token
   * @returns The user or null if not found
   */
  @NoCache()
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmailVerificationToken(token);
  }

  /**
   * Find a user by password reset token
   * @param token - User's password reset token
   * @returns The user or null if not found
   */
  @NoCache()
  async findByPasswordToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByPasswordToken(token);
  }

  /**
   * Update a user by ID
   * @param id - User's ID
   * @returns The updated user
   */
  @EnableCache()
  @CacheTTL(1800)
  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    return this.postgresRepo.update(id, updateUserDto);
  }

  /**
   * Remove a user by ID
   * @param id
   * @returns The removed user
   */
  @EnableCache()
  @CacheTTL(1800)
  async remove(id: string): Promise<IUser> {
    return this.postgresRepo.remove(id);
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
    await this.postgresRepo.update(userId!, resetData);
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
    await this.postgresRepo.update(userId, passwordData, false);
  }

  /**
   * Update user roles
   * @param userId - User's ID
   * @param roles - New roles array
   * @returns The updated user
   */
  async updateRoles(userId: string, roles: Role[]): Promise<IUser> {
    return this.postgresRepo.update(userId, { roles });
  }

  /**
   * Add a role to the user if not already present
   * @param userId - User's ID
   * @param role - Role to add
   * @returns The updated user
   */
  async addRole(userId: string, role: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.roles.includes(role)) {
      const newRoles = [...user.roles, role];
      return this.updateRoles(userId, newRoles);
    }
    
    return user;
  }

  /**
   * Remove a role from the user
   * @param userId - User's ID
   * @param role - Role to remove
   * @returns The updated user
   */
  async removeRole(userId: string, role: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const newRoles = user.roles.filter(r => r !== role);
    return this.updateRoles(userId, newRoles);
  }

  /**
   * Replace one role with another
   * @param userId - User's ID
   * @param oldRole - Role to replace
   * @param newRole - New role
   * @returns The updated user
   */
  async replaceRole(userId: string, oldRole: Role, newRole: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const newRoles = user.roles.map(r => r === oldRole ? newRole : r);
    const uniqueRoles = [...new Set(newRoles)];
    return this.updateRoles(userId, uniqueRoles);
  }
}
