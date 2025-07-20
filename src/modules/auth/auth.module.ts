import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '@modules/users/schemas/user.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { SessionSerializer } from './session.serializer';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import {EmailModule} from "@modules/email/email.module"; // Add this import

@Module({
    imports: [
        UsersModule,
        EmailModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        JwtModule.registerAsync({
            imports: [],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '1h',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        AuthService,
        JwtStrategy,
        SessionSerializer,
        {
            provide: 'BCRYPT_SALT_ROUNDS',
            useValue: 16,
        },
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}