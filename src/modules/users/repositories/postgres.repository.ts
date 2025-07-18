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

    async findAll(): Promise<UserEntity[] | null> {
        return this.userRepository.find({});
    }

    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findByPasswordToken(token: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: {passwordResetToken: token } });
    }

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
