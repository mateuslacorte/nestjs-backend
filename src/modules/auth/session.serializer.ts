import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SessionSerializer extends PassportSerializer {
    constructor(private readonly usersService: UsersService) {
        super();
    }

    /**
     * Serialize user instance to the session.
     * @param user - The user object to serialize.
     * @param done - Callback to proceed with the next step.
     */
    serializeUser(user: User, done: (err: any, id?: any) => void): void {
        done(null, user.id); // Save only the user ID in the session.
    }

    /**
     * Deserialize user instance from the session.
     * @param id - The user ID saved in the session.
     * @param done - Callback to proceed with the next step.
     */
    async deserializeUser(id: string, done: (err: any, user?: any) => void): Promise<void> {
        try {
            const user = await this.usersService.findById(id);
            if (!user) {
                return done(new Error('User not found'));
            }
            done(null, user);
        } catch (err) {
            done(err);
        }
    }
}
