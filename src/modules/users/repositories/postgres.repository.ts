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

    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async upsert(userData: IUser): Promise<UserEntity> {
        // Check if user exists
        let user: UserEntity | null = null;

        if (userData.id) {
            user = await this.userRepository.findOne({ where: { id: userData.id } });
        }

        if (!user && userData.email) {
            user = await this.userRepository.findOne({ where: { email: userData.email } });
        }

        if (user) {
            // Update existing user
            Object.assign(user, userData);
            return this.userRepository.save(user);
        } else {
            // Create new user
            const newUser = this.userRepository.create(userData);
            return this.userRepository.save(newUser);
        }
    }
}
