import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '@modules/users/schemas/user.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { SessionSerializer } from './session.serializer';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import { EmailModule } from '@modules/email/email.module';

@Module({
    imports: [
        UsersModule,
        EmailModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        JwtModule.registerAsync({
            imports: [],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get<string>('jwt.expirationTime'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        AuthService,
        JwtStrategy,
        GoogleStrategy,
        GoogleAuthGuard,
        FacebookStrategy,
        FacebookAuthGuard,
        OauthExchangeService,
        SessionSerializer,
        {
            provide: 'BCRYPT_SALT_ROUNDS',
            useFactory: (configService: ConfigService) =>
                configService.get<number>('bcrypt.saltRounds'),
            inject: [ConfigService],
        },
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
