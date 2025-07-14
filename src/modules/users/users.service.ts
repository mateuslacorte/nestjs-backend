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

  async create(userData: CreateUserDto): Promise<IUser> {
    // Write to MongoDB
    const user = await this.mongoRepo.create(userData);
    // Sync to PostgreSQL
    await this.postgresRepo.upsert(user);
    return user;
  }

  async findAll(): Promise<IUser[]> {
    // Read from MongoDB
    return this.mongoRepo.findAll();
  }

  async findById(id: string): Promise<IUser | null> {
    // Read from PostgreSQL
    return this.postgresRepo.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    // Read from PostgreSQL
    return this.postgresRepo.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    // Update in MongoDB
    const updatedUser = await this.mongoRepo.update(id, updateUserDto);
    // Sync to PostgreSQL
    await this.postgresRepo.upsert(updatedUser);
    return updatedUser;
  }

  async remove(id: string): Promise<IUser> {
    // Remove from MongoDB
    const removedUser = await this.mongoRepo.remove(id);
    // TODO: Consider how to handle deletion in PostgreSQL
    return removedUser;
  }

  // You might need synchronization logic between databases
  async syncUser(userId: string): Promise<void> {
    const user = await this.mongoRepo.findById(userId);
    if (user) {
      await this.postgresRepo.upsert(user);
    }
  }
}
