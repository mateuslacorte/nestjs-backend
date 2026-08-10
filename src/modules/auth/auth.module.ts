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
import { TwitterStrategy } from './strategies/twitter.strategy';
import { TwitterAuthGuard } from './guards/twitter-auth.guard';
import { GithubStrategy } from './strategies/github.strategy';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { FigmaStrategy } from './strategies/figma.strategy';
import { FigmaAuthGuard } from './guards/figma-auth.guard';
import { LinkedinStrategy } from './strategies/linkedin.strategy';
import { LinkedinAuthGuard } from './guards/linkedin-auth.guard';
import { SlackStrategy } from './strategies/slack.strategy';
import { SlackAuthGuard } from './guards/slack-auth.guard';
import { AtlassianStrategy } from './strategies/atlassian.strategy';
import { AtlassianAuthGuard } from './guards/atlassian-auth.guard';
import { GitlabStrategy } from './strategies/gitlab.strategy';
import { GitlabAuthGuard } from './guards/gitlab-auth.guard';
import { BitbucketStrategy } from './strategies/bitbucket.strategy';
import { BitbucketAuthGuard } from './guards/bitbucket-auth.guard';
import { DiscordStrategy } from './strategies/discord.strategy';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { TwitchStrategy } from './strategies/twitch.strategy';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { SteamStrategy } from './strategies/steam.strategy';
import { SteamAuthGuard } from './guards/steam-auth.guard';
import { AppleStrategy } from './strategies/apple.strategy';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { AmazonStrategy } from './strategies/amazon.strategy';
import { AmazonAuthGuard } from './guards/amazon-auth.guard';
import { PatreonStrategy } from './strategies/patreon.strategy';
import { DropboxStrategy } from './strategies/dropbox.strategy';
import { PatreonAuthGuard } from './guards/patreon-auth.guard';
import { DropboxAuthGuard } from './guards/dropbox-auth.guard';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { ActiveDirectoryLdapService } from './services/active-directory-ldap.service';
import { MetamaskSiweService } from './services/metamask-siwe.service';
import { SessionSerializer } from './session.serializer';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import { EmailModule } from '@modules/email/email.module';
import { AuditModule } from '@common/audit/audit.module';

@Module({
    imports: [
        UsersModule,
        EmailModule,
        AuditModule,
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
        TwitterStrategy,
        TwitterAuthGuard,
        GithubStrategy,
        GithubAuthGuard,
        FigmaStrategy,
        FigmaAuthGuard,
        LinkedinStrategy,
        LinkedinAuthGuard,
        SlackStrategy,
        SlackAuthGuard,
        AtlassianStrategy,
        AtlassianAuthGuard,
        GitlabStrategy,
        GitlabAuthGuard,
        BitbucketStrategy,
        BitbucketAuthGuard,
        DiscordStrategy,
        DiscordAuthGuard,
        TwitchStrategy,
        TwitchAuthGuard,
        SteamStrategy,
        SteamAuthGuard,
        AppleStrategy,
        AppleAuthGuard,
        AmazonStrategy,
        AmazonAuthGuard,
        PatreonStrategy,
        PatreonAuthGuard,
        DropboxStrategy,
        DropboxAuthGuard,
        OauthExchangeService,
        ActiveDirectoryLdapService,
        MetamaskSiweService,
        SessionSerializer,
        {
            provide: 'ARGON2_OPTIONS',
            useFactory: (configService: ConfigService) => ({
                memoryCost: configService.get<number>('argon2.memoryCost'),
                timeCost: configService.get<number>('argon2.timeCost'),
                parallelism: configService.get<number>('argon2.parallelism'),
            }),
            inject: [ConfigService],
        },
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
