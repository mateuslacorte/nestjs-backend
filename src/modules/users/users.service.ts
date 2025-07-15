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
    const user = await this.mongoRepo.create(userData, true);
    await this.postgresRepo.upsert(user);
    return user;
  }

  async findAll(): Promise<IUser[] | null> {
    return this.postgresRepo.findAll();
  }

  async findById(id: string): Promise<IUser | null> {
    return this.postgresRepo.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    const updatedUser = await this.mongoRepo.update(id, updateUserDto);
    await this.postgresRepo.upsert(updatedUser);
    return updatedUser;
  }

  async remove(id: string): Promise<IUser> {
    const removedUser = await this.mongoRepo.remove(id);
    // TODO: Consider how to handle deletion in PostgreSQL
    return removedUser;
  }

  async syncUser(userId: string): Promise<void> {
    const user = await this.mongoRepo.findById(userId);
    if (user) {
      await this.postgresRepo.upsert(user);
    }
  }
}
