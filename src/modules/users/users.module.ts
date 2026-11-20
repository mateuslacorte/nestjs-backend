import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { User, UserSchema } from './schemas/user.schema';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserMongoRepository } from './repositories/mongo.repository';
import { UserPostgresRepository } from './repositories/postgres.repository';
import { UsersResolver } from '@modules/users/resolvers/users.resolver';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { AuditModule } from '@common/audit/audit.module';
import { EmailModule } from '@modules/email/email.module';

// Command handlers
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { UpdateUserHandler } from './commands/handlers/update-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';
import { SendWelcomeEmailHandler } from './commands/handlers/send-welcome-email.handler';
import { RevokeUserSessionsHandler } from './commands/handlers/revoke-user-sessions.handler';

// Query handlers
import { FindUserByIdHandler } from './queries/handlers/find-user-by-id.handler';
import { SearchUsersHandler } from './queries/handlers/search-users.handler';

// Event handlers
import { UserCreatedHandler } from './events/handlers/user-created.handler';
import { UserUpdatedHandler } from './events/handlers/user-updated.handler';
import { UserDeletedHandler } from './events/handlers/user-deleted.handler';

// Sagas
import { UserRegistrationSaga } from './sagas/user-registration.saga';
import { UserDeletionSaga } from './sagas/user-deletion.saga';

const CommandHandlers = [CreateUserHandler, UpdateUserHandler, DeleteUserHandler, SendWelcomeEmailHandler, RevokeUserSessionsHandler];
const QueryHandlers = [FindUserByIdHandler, SearchUsersHandler];
const EventHandlers = [UserCreatedHandler, UserUpdatedHandler, UserDeletedHandler];
const Sagas = [UserRegistrationSaga, UserDeletionSaga];

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TypeOrmModule.forFeature([UserEntity]),
    AuditModule,
    EmailModule,
  ],
  providers: [
    UsersResolver,
    UsersService,
    UserMongoRepository,
    UserPostgresRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...Sagas,
    {
      provide: 'ARGON2_OPTIONS',
      useFactory: (configService: ConfigService) => ({
        memoryCost: configService.get<number>('argon2.memoryCost'),
        timeCost: configService.get<number>('argon2.timeCost'),
        parallelism: configService.get<number>('argon2.parallelism'),
      }),
      inject: [ConfigService],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
