import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserMongoRepository } from './repositories/mongo.repository';
import { UserPostgresRepository } from './repositories/postgres.repository';
import {UsersResolver} from "@modules/users/resolvers/users.resolver";
import {APP_GUARD} from "@nestjs/core";
import {RolesGuard} from "@modules/auth/guards/roles.guard";
import {JwtAuthGuard} from "@modules/auth/guards/jwtauth.guard";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  providers: [
    UsersResolver,
    UsersService,
    UserMongoRepository,
    UserPostgresRepository,
    {
      provide: 'BCRYPT_SALT_ROUNDS',
      useFactory: (configService: ConfigService) => configService.get<number>('bcrypt.saltRounds'),
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
