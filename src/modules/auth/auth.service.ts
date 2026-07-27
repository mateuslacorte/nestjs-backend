import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { IUser } from '../users/interfaces/user.interface';
import { randomBytes } from 'crypto';
import {ResetPasswordDto} from "@modules/auth/dtos/reset-password.dto";
import {EmailService} from "@modules/email/email.service";
import { withJitter } from './utils/jwt-expiration.util';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { FacebookProfilePayload } from './strategies/facebook.strategy';
import { TwitterProfilePayload } from './strategies/twitter.strategy';
import { GithubProfilePayload } from './strategies/github.strategy';
import { FigmaProfilePayload } from './strategies/figma.strategy';
import { LinkedinProfilePayload } from './strategies/linkedin.strategy';
import { SlackProfilePayload } from './strategies/slack.strategy';
import { AtlassianProfilePayload } from './strategies/atlassian.strategy';
import { GitlabProfilePayload } from './strategies/gitlab.strategy';
import { BitbucketProfilePayload } from './strategies/bitbucket.strategy';
import { DiscordProfilePayload } from './strategies/discord.strategy';
import { TwitchProfilePayload } from './strategies/twitch.strategy';
import { SteamProfilePayload } from './strategies/steam.strategy';
import { RedditProfilePayload } from './strategies/reddit.strategy';
import { AppleProfilePayload } from './strategies/apple.strategy';
import { SpotifyProfilePayload } from './strategies/spotify.strategy';
import { AmazonProfilePayload } from './strategies/amazon.strategy';
import { MicrosoftProfilePayload } from './strategies/microsoft.strategy';
import { PatreonProfilePayload } from './strategies/patreon.strategy';
import { DropboxProfilePayload } from './strategies/dropbox.strategy';
import { CoinbaseProfilePayload } from './strategies/coinbase.strategy';
import { ActiveDirectoryProfilePayload } from './interfaces/active-directory-profile.interface';
import { ActiveDirectoryLdapService } from './services/active-directory-ldap.service';
import { MetamaskSiweService } from './services/metamask-siwe.service';
import { AdLoginDto } from './dtos/ad-login.dto';
import { MetamaskVerifyDto } from './dtos/metamask-verify.dto';
import { Role } from './enums/role.enum';
import { ExchangeCodeDto } from './dtos/exchange-code.dto';
import { verifyPassword } from '@common/crypto/password.util';
import { generateRandomDisplayName } from './utils/generate-random-display-name.util';

@Injectable()
export class AuthService {
    /* istanbul ignore start -- Nest DI constructor parameter emit */
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
        private readonly oauthExchangeService: OauthExchangeService,
        private readonly activeDirectoryLdapService: ActiveDirectoryLdapService,
        private readonly metamaskSiweService: MetamaskSiweService,
    ) {}
    /* istanbul ignore end */

    /**
     * Register a new user
     * @param registerDto - User registration data
     * @returns The created user and access token
     */
    async register(registerDto: RegisterDto): Promise<any> {
        const { password, confirmPassword, ...userData } = registerDto;

        // Check if passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        // Check if user with email already exists
        const existingUser = await this.usersService.findByEmail(userData.email);
        if (existingUser) {
            throw new ConflictException('A user with this email already exists');
        }

        // Create the user with isActive set to false
        const newUser = await this.usersService.create({
            ...userData,
            password: password,
            isActive: false, // Set to false until email is confirmed
            roles: [],
        });

        // Generate email verification token and send confirmation email
        const verificationToken = await this.createEmailVerificationToken(newUser.email);
        await this.sendEmailVerification(newUser.email, verificationToken);

        // Generate tokens
        const tokens = await this.generateTokens(newUser);

        return {
            user: this.sanitizeUser(newUser),
            ...tokens,
            message: 'Registration successful. Please check your email to confirm your account.',
        };
    }

    /**
     * Create an email verification token for the user
     * @param email - User email to create verification token for
     * @returns The verification token
     */
    async createEmailVerificationToken(email: string): Promise<string> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate a random token
        const verificationToken = String(parseInt(randomBytes(4).toString('hex'), 16) % 1000000).padStart(6, '0');

        // Store the token with the user and set expiration (e.g., 24 hours from now)
        const tokenExpiry = new Date(Date.now() + 86400000); // 24 hours

        // Update user with verification token info
        await this.usersService.update(user.id!, {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: tokenExpiry
        });

        // Return the original (unhashed) token to be sent to the user
        return verificationToken;
    }

    /**
     * Send email verification token via email
     * @param email - User email to send verification token to
     * @param token - The verification token to send
     */
    async sendEmailVerification(email: string, token: string): Promise<void> {
        await this.emailService.sendEmailConfirmation(email, token);
    }

    /**
     * Verify user's email using the verification token
     * @param token - The verification token
     * @returns True if email verification was successful
     */
    async verifyEmail(token: string): Promise<boolean> {
        // Find user by token (you'll need to add this method to UsersService)
        const user = await this.usersService.findByEmailVerificationToken(token);
        if (!user) {
            throw new NotFoundException('Invalid verification token');
        }

        // Check if user has a valid verification token
        if (!user.emailVerificationToken || !user.emailVerificationExpires) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        // Check if token is expired
        if (new Date() > new Date(user.emailVerificationExpires)) {
            throw new BadRequestException('Verification token has expired');
        }

        // Verify the token
        const isTokenValid = token === user.emailVerificationToken;
        if (!isTokenValid) {
            throw new BadRequestException('Invalid verification token');
        }

        // Update the user to be active and clear the verification token
        await this.usersService.update(user.id!, {
            isActive: true,
            emailVerificationToken: "",
            emailVerificationExpires: undefined,
        });

        return true;
    }

    /**
     * Authenticate a user and generate tokens
     * @param loginDto - User login credentials
     * @returns The authenticated user and access token
     */
    async login(loginDto: LoginDto): Promise<any> {
        const { email, password } = loginDto;

        // Validate user credentials
        const user = await this.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Login with on-prem Active Directory (LDAP/LDAPS bind on domain controller).
     */
    async loginWithActiveDirectory(dto: AdLoginDto): Promise<{
        user: Partial<IUser>;
        accessToken: string;
        refreshToken: string;
    }> {
        const profile = await this.activeDirectoryLdapService.authenticate(
            dto.username,
            dto.password,
        );
        const user = await this.findOrCreateActiveDirectoryUser(profile);
        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Issue a short-lived SIWE nonce for MetaMask login.
     */
    async issueMetamaskNonce(): Promise<{ nonce: string; expiresIn: number }> {
        return this.metamaskSiweService.createNonce();
    }

    /**
     * Login with MetaMask via SIWE message + signature. Returns JWT tokens
     * (same contract as POST /auth/login).
     */
    async loginWithMetamask(dto: MetamaskVerifyDto): Promise<{
        user: Partial<IUser>;
        accessToken: string;
        refreshToken: string;
    }> {
        const profile = await this.metamaskSiweService.verifyAndGetProfile(
            dto.message,
            dto.signature,
        );
        const user = await this.findOrCreateMetamaskUser(profile);
        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Validate user by email and password
     * @param email - User email
     * @param password - User password
     * @returns The validated user or null
     */
    async validateUser(email: string, password: string): Promise<IUser | null> {
        const user = await this.usersService.findByEmail(email, true);
        if (!user || !user.password) {
            return null;
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        // Check if user has verified their email
        if (!user.isActive) {
            throw new UnauthorizedException('Please verify your email before logging in');
        }

        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
    }

    /**
     * Validate user by ID (used by JWT strategy)
     * @param userId - User ID
     * @returns The validated user or null
     */
    async validateUserById(userId: string): Promise<IUser | null> {
        return this.usersService.findById(userId);
    }

    /**
     * Refresh access token using refresh token
     * @param refreshTokenDto - Refresh token data
     * @returns New access token and refresh token
     */
    async refreshToken(refreshTokenDto: RefreshtokenDto): Promise<any> {
        const { refreshToken } = refreshTokenDto;

        try {
            // Verify the refresh token
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('jwt.refreshSecret'),
            });

            const user = await this.usersService.findById(payload.id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Create a password reset token for the user
     * @param email - User email to create reset token for
     * @returns The reset token
     */
    async createPasswordResetToken(email: string): Promise<string> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate a random token
        const resetToken = String(parseInt(randomBytes(4).toString('hex'), 16) % 1000000).padStart(6, '0');

        // Store the token with the user and set expiration (e.g., 1 hour from now)
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token info
        await this.usersService.updateResetToken(user.id, {
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpiry
        });

        // Return the original (unhashed) token to be sent to the user
        return resetToken;
    }

    /**
     * Reset user password using the reset token
     * @param resetPasswordDto - Data for resetting the password
     * @returns True if password reset was successful
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<boolean> {
        const { token, password, confirmPassword } = resetPasswordDto;

        // Check if passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const user = await this.usersService.findByPasswordToken(token);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if user has a valid reset token
        if (!user.passwordResetToken || !user.passwordResetExpires) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Check if token is expired
        if (new Date() > new Date(user.passwordResetExpires)) {
            throw new BadRequestException('Reset token has expired');
        }

        // Verify the token
        const isTokenValid = token === user.passwordResetToken;
        if (!isTokenValid) {
            throw new BadRequestException('Invalid reset token');
        }

        // Update the user's password and clear the reset token
        await this.usersService.updatePassword(user.id!, {
            password: password,
            passwordResetToken: "",
            passwordResetExpires: undefined,
        });

        return true;
    }

    /**
     * Send password reset token via email
     * @param email - User email to send reset token to
     * @param token - The reset token to send
     * @returns The reset token sent to the user
     */
    async sendResetTokenEmail(email: string, token: string) {
        await this.emailService.sendPasswordReset(email, token);
        return token;
    }

    /**
     * Change password for logged-in user
     * @param userId - ID of the logged-in user
     * @param changePasswordDto - Current and new password data
     * @returns Success message
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
        const { currentPassword, newPassword, confirmNewPassword } = changePasswordDto;

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('New password and confirmation do not match');
        }

        // Check if new password is different from current
        if (currentPassword === newPassword) {
            throw new BadRequestException('New password must be different from the current password');
        }

        // Find the user
        const user = await this.usersService.findById(userId, true);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        if (!user.password) {
            throw new BadRequestException(
                'This account uses social login and has no local password',
            );
        }
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Update password
        await this.usersService.updatePassword(userId, {
            password: newPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });

        return { message: 'Password changed successfully' };
    }

    /**
     * Issue JWT access/refresh tokens for a user (used by OAuth exchange and login).
     */
    async issueTokensForUser(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        return this.generateTokens(user);
    }

    /**
     * After Google OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeGoogleOAuth(
        profile: GoogleProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertGoogleAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'googleOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateGoogleUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Facebook OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeFacebookOAuth(
        profile: FacebookProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertFacebookAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'facebookOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateFacebookUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After X / Twitter OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeTwitterOAuth(
        profile: TwitterProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertTwitterAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'twitterOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateTwitterUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After GitHub OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeGithubOAuth(
        profile: GithubProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertGithubAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'githubOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateGithubUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Figma OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeFigmaOAuth(
        profile: FigmaProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertFigmaAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'figmaOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateFigmaUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After LinkedIn OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeLinkedinOAuth(
        profile: LinkedinProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertLinkedinAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'linkedinOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateLinkedinUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Slack OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeSlackOAuth(
        profile: SlackProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertSlackAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'slackOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateSlackUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Atlassian OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeAtlassianOAuth(
        profile: AtlassianProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertAtlassianAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'atlassianOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateAtlassianUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After GitLab OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeGitlabOAuth(
        profile: GitlabProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertGitlabAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'gitlabOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateGitlabUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Bitbucket OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeBitbucketOAuth(
        profile: BitbucketProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertBitbucketAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'bitbucketOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateBitbucketUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Discord OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeDiscordOAuth(
        profile: DiscordProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertDiscordAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'discordOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateDiscordUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Twitch OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeTwitchOAuth(
        profile: TwitchProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertTwitchAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'twitchOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateTwitchUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Steam OpenID callback: upsert user, create exchange code, build redirect URL.
     */
    async completeSteamOAuth(
        profile: SteamProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertSteamAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'steamOpenId.redirectAllowlist',
        );
        const user = await this.findOrCreateSteamUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Reddit OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeRedditOAuth(
        profile: RedditProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertRedditAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'redditOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateRedditUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Spotify OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeSpotifyOAuth(
        profile: SpotifyProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertSpotifyAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'spotifyOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateSpotifyUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Amazon OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeAmazonOAuth(
        profile: AmazonProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertAmazonAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'amazonOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateAmazonUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Microsoft OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeMicrosoftOAuth(
        profile: MicrosoftProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertMicrosoftAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'microsoftOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateMicrosoftUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Patreon OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completePatreonOAuth(
        profile: PatreonProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertPatreonAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'patreonOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreatePatreonUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Dropbox OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeDropboxOAuth(
        profile: DropboxProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertDropboxAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'dropboxOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateDropboxUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * After Coinbase OAuth callback: upsert user, create exchange code, build redirect URL.
     */
    async completeCoinbaseOAuth(
        profile: CoinbaseProfilePayload,
        state?: string,
    ): Promise<{ redirectUrl: string }> {
        this.assertCoinbaseAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'coinbaseOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateCoinbaseUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    /**
     * Exchange a one-time OAuth code for JWT tokens (Google, Facebook, Twitter, GitHub, Figma, LinkedIn, Slack, Atlassian, GitLab, Bitbucket, Discord, Twitch, Steam, Reddit, Apple, Spotify, Amazon, Microsoft, Patreon, Dropbox, or Coinbase).
     */
    async exchangeOAuthCode(dto: ExchangeCodeDto): Promise<{
        user: Partial<IUser>;
        accessToken: string;
        refreshToken: string;
    }> {
        this.assertAnySocialAuthEnabled();

        const userId = await this.oauthExchangeService.consumeExchangeCode(dto.code);
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('Invalid or expired exchange code');
        }
        if (!user.isActive) {
            throw new UnauthorizedException('User account is not active');
        }

        const tokens = await this.generateTokens(user);
        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /** @deprecated Use exchangeOAuthCode — kept as alias for callers */
    async exchangeGoogleCode(dto: ExchangeCodeDto) {
        return this.exchangeOAuthCode(dto);
    }

    private assertGoogleAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('googleOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Google authentication is disabled');
        }
    }

    private assertFacebookAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('facebookOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Facebook authentication is disabled');
        }
    }

    private assertTwitterAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('twitterOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Twitter authentication is disabled');
        }
    }

    private assertGithubAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('githubOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('GitHub authentication is disabled');
        }
    }

    private assertFigmaAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('figmaOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Figma authentication is disabled');
        }
    }

    private assertLinkedinAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('linkedinOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('LinkedIn authentication is disabled');
        }
    }

    private assertSlackAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('slackOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Slack authentication is disabled');
        }
    }

    private assertAtlassianAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('atlassianOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Atlassian authentication is disabled');
        }
    }

    private assertGitlabAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('gitlabOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('GitLab authentication is disabled');
        }
    }

    private assertBitbucketAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('bitbucketOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Bitbucket authentication is disabled');
        }
    }

    private assertDiscordAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('discordOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Discord authentication is disabled');
        }
    }

    private assertTwitchAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('twitchOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Twitch authentication is disabled');
        }
    }

    private assertSpotifyAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('spotifyOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Spotify authentication is disabled');
        }
    }

    private assertAmazonAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('amazonOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Amazon authentication is disabled');
        }
    }

    private assertMicrosoftAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('microsoftOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException(
                'Microsoft authentication is disabled',
            );
        }
    }

    private assertPatreonAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('patreonOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException(
                'Patreon authentication is disabled',
            );
        }
    }

    private assertDropboxAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('dropboxOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException(
                'Dropbox authentication is disabled',
            );
        }
    }

    private assertCoinbaseAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('coinbaseOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException(
                'Coinbase authentication is disabled',
            );
        }
    }

    private assertSteamAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('steamOpenId.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Steam authentication is disabled');
        }
    }

    async completeAppleOAuth(
        profile: AppleProfilePayload,
        state: string | undefined,
    ): Promise<{ redirectUrl: string }> {
        this.assertAppleAuthEnabled();

        const redirectBase = this.parseAndValidateRedirectFromState(
            state,
            'appleOAuth.redirectAllowlist',
        );
        const user = await this.findOrCreateAppleUser(profile);
        const code = await this.oauthExchangeService.createExchangeCode(user.id!);
        const separator = redirectBase.includes('?') ? '&' : '?';

        return {
            redirectUrl: `${redirectBase}${separator}code=${encodeURIComponent(code)}`,
        };
    }

    private assertRedditAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('redditOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Reddit authentication is disabled');
        }
    }

    private assertAppleAuthEnabled(): void {
        const enabled = this.configService.get<boolean>('appleOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Apple authentication is disabled');
        }
    }

    private assertAnySocialAuthEnabled(): void {
        const google = this.configService.get<boolean>('googleOAuth.enabled');
        const facebook = this.configService.get<boolean>('facebookOAuth.enabled');
        const twitter = this.configService.get<boolean>('twitterOAuth.enabled');
        const github = this.configService.get<boolean>('githubOAuth.enabled');
        const figma = this.configService.get<boolean>('figmaOAuth.enabled');
        const linkedin = this.configService.get<boolean>('linkedinOAuth.enabled');
        const slack = this.configService.get<boolean>('slackOAuth.enabled');
        const atlassian = this.configService.get<boolean>('atlassianOAuth.enabled');
        const gitlab = this.configService.get<boolean>('gitlabOAuth.enabled');
        const bitbucket = this.configService.get<boolean>('bitbucketOAuth.enabled');
        const discord = this.configService.get<boolean>('discordOAuth.enabled');
        const twitch = this.configService.get<boolean>('twitchOAuth.enabled');
        const steam = this.configService.get<boolean>('steamOpenId.enabled');
        const reddit = this.configService.get<boolean>('redditOAuth.enabled');
        const apple = this.configService.get<boolean>('appleOAuth.enabled');
        const spotify = this.configService.get<boolean>('spotifyOAuth.enabled');
        const amazon = this.configService.get<boolean>('amazonOAuth.enabled');
        const microsoft = this.configService.get<boolean>('microsoftOAuth.enabled');
        const patreon = this.configService.get<boolean>('patreonOAuth.enabled');
        const dropbox = this.configService.get<boolean>('dropboxOAuth.enabled');
        const coinbase = this.configService.get<boolean>('coinbaseOAuth.enabled');
        if (
            !google &&
            !facebook &&
            !twitter &&
            !github &&
            !figma &&
            !linkedin &&
            !slack &&
            !atlassian &&
            !gitlab &&
            !bitbucket &&
            !discord &&
            !twitch &&
            !steam &&
            !reddit &&
            !apple &&
            !spotify &&
            !amazon &&
            !microsoft &&
            !patreon &&
            !dropbox &&
            !coinbase
        ) {
            throw new ServiceUnavailableException('Social authentication is disabled');
        }
    }

    private parseAndValidateRedirectFromState(
        state: string | undefined,
        allowlistConfigKey: string,
    ): string {
        if (!state) {
            throw new BadRequestException('Missing OAuth state');
        }

        let redirect: string;
        try {
            const parsed = JSON.parse(
                Buffer.from(state, 'base64url').toString('utf8'),
            ) as { r?: string };
            if (!parsed.r || typeof parsed.r !== 'string') {
                throw new Error('invalid');
            }
            redirect = parsed.r;
        } catch {
            throw new BadRequestException('Invalid OAuth state');
        }

        const allowlist =
            this.configService.get<string[]>(allowlistConfigKey) || [];
        const allowed = allowlist.some(
            (prefix) => redirect === prefix || redirect.startsWith(prefix),
        );
        if (!allowed) {
            throw new BadRequestException('Redirect URL is not allowed');
        }

        return redirect;
    }

    private async findOrCreateGoogleUser(
        profile: GoogleProfilePayload,
    ): Promise<IUser> {
        const byGoogle = await this.usersService.findByGoogleId(profile.googleId);
        if (byGoogle) {
            if (!byGoogle.isActive) {
                return this.usersService.update(byGoogle.id!, { isActive: true });
            }
            return byGoogle;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                googleId: profile.googleId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('googleOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            googleId: profile.googleId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateFacebookUser(
        profile: FacebookProfilePayload,
    ): Promise<IUser> {
        const byFacebook = await this.usersService.findByFacebookId(profile.facebookId);
        if (byFacebook) {
            if (!byFacebook.isActive) {
                return this.usersService.update(byFacebook.id!, { isActive: true });
            }
            return byFacebook;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                facebookId: profile.facebookId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('facebookOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            facebookId: profile.facebookId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateTwitterUser(
        profile: TwitterProfilePayload,
    ): Promise<IUser> {
        const byTwitter = await this.usersService.findByTwitterId(profile.twitterId);
        if (byTwitter) {
            if (!byTwitter.isActive) {
                return this.usersService.update(byTwitter.id!, { isActive: true });
            }
            return byTwitter;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                twitterId: profile.twitterId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('twitterOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            twitterId: profile.twitterId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateGithubUser(
        profile: GithubProfilePayload,
    ): Promise<IUser> {
        const byGithub = await this.usersService.findByGithubId(profile.githubId);
        if (byGithub) {
            if (!byGithub.isActive) {
                return this.usersService.update(byGithub.id!, { isActive: true });
            }
            return byGithub;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                githubId: profile.githubId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('githubOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            githubId: profile.githubId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateFigmaUser(
        profile: FigmaProfilePayload,
    ): Promise<IUser> {
        const byFigma = await this.usersService.findByFigmaId(profile.figmaId);
        if (byFigma) {
            if (!byFigma.isActive) {
                return this.usersService.update(byFigma.id!, { isActive: true });
            }
            return byFigma;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                figmaId: profile.figmaId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('figmaOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            figmaId: profile.figmaId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateLinkedinUser(
        profile: LinkedinProfilePayload,
    ): Promise<IUser> {
        const byLinkedin = await this.usersService.findByLinkedinId(
            profile.linkedinId,
        );
        if (byLinkedin) {
            if (!byLinkedin.isActive) {
                return this.usersService.update(byLinkedin.id!, { isActive: true });
            }
            return byLinkedin;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                linkedinId: profile.linkedinId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('linkedinOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            linkedinId: profile.linkedinId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateSlackUser(
        profile: SlackProfilePayload,
    ): Promise<IUser> {
        const bySlack = await this.usersService.findBySlackId(profile.slackId);
        if (bySlack) {
            if (!bySlack.isActive) {
                return this.usersService.update(bySlack.id!, { isActive: true });
            }
            return bySlack;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                slackId: profile.slackId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('slackOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            slackId: profile.slackId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateAtlassianUser(
        profile: AtlassianProfilePayload,
    ): Promise<IUser> {
        const byAtlassian = await this.usersService.findByAtlassianId(
            profile.atlassianId,
        );
        if (byAtlassian) {
            if (!byAtlassian.isActive) {
                return this.usersService.update(byAtlassian.id!, { isActive: true });
            }
            return byAtlassian;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                atlassianId: profile.atlassianId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('atlassianOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            atlassianId: profile.atlassianId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateGitlabUser(
        profile: GitlabProfilePayload,
    ): Promise<IUser> {
        const byGitlab = await this.usersService.findByGitlabId(profile.gitlabId);
        if (byGitlab) {
            if (!byGitlab.isActive) {
                return this.usersService.update(byGitlab.id!, { isActive: true });
            }
            return byGitlab;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                gitlabId: profile.gitlabId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('gitlabOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            gitlabId: profile.gitlabId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateBitbucketUser(
        profile: BitbucketProfilePayload,
    ): Promise<IUser> {
        const byBitbucket = await this.usersService.findByBitbucketId(
            profile.bitbucketId,
        );
        if (byBitbucket) {
            if (!byBitbucket.isActive) {
                return this.usersService.update(byBitbucket.id!, { isActive: true });
            }
            return byBitbucket;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                bitbucketId: profile.bitbucketId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('bitbucketOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            bitbucketId: profile.bitbucketId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateDiscordUser(
        profile: DiscordProfilePayload,
    ): Promise<IUser> {
        const byDiscord = await this.usersService.findByDiscordId(profile.discordId);
        if (byDiscord) {
            if (!byDiscord.isActive) {
                return this.usersService.update(byDiscord.id!, { isActive: true });
            }
            return byDiscord;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                discordId: profile.discordId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('discordOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            discordId: profile.discordId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateTwitchUser(
        profile: TwitchProfilePayload,
    ): Promise<IUser> {
        const byTwitch = await this.usersService.findByTwitchId(profile.twitchId);
        if (byTwitch) {
            if (!byTwitch.isActive) {
                return this.usersService.update(byTwitch.id!, { isActive: true });
            }
            return byTwitch;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                twitchId: profile.twitchId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('twitchOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            twitchId: profile.twitchId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateSpotifyUser(
        profile: SpotifyProfilePayload,
    ): Promise<IUser> {
        const bySpotify = await this.usersService.findBySpotifyId(
            profile.spotifyId,
        );
        if (bySpotify) {
            if (!bySpotify.isActive) {
                return this.usersService.update(bySpotify.id!, { isActive: true });
            }
            return bySpotify;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                spotifyId: profile.spotifyId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('spotifyOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            spotifyId: profile.spotifyId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateAmazonUser(
        profile: AmazonProfilePayload,
    ): Promise<IUser> {
        const byAmazon = await this.usersService.findByAmazonId(profile.amazonId);
        if (byAmazon) {
            if (!byAmazon.isActive) {
                return this.usersService.update(byAmazon.id!, { isActive: true });
            }
            return byAmazon;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                amazonId: profile.amazonId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('amazonOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            amazonId: profile.amazonId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateMicrosoftUser(
        profile: MicrosoftProfilePayload,
    ): Promise<IUser> {
        const byMicrosoft = await this.usersService.findByMicrosoftId(
            profile.microsoftId,
        );
        if (byMicrosoft) {
            if (!byMicrosoft.isActive) {
                return this.usersService.update(byMicrosoft.id!, {
                    isActive: true,
                });
            }
            return byMicrosoft;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                microsoftId: profile.microsoftId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('microsoftOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            microsoftId: profile.microsoftId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreatePatreonUser(
        profile: PatreonProfilePayload,
    ): Promise<IUser> {
        const byPatreon = await this.usersService.findByPatreonId(profile.patreonId);
        if (byPatreon) {
            if (!byPatreon.isActive) {
                return this.usersService.update(byPatreon.id!, { isActive: true });
            }
            return byPatreon;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                patreonId: profile.patreonId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('patreonOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            patreonId: profile.patreonId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateDropboxUser(
        profile: DropboxProfilePayload,
    ): Promise<IUser> {
        const byDropbox = await this.usersService.findByDropboxId(profile.dropboxId);
        if (byDropbox) {
            if (!byDropbox.isActive) {
                return this.usersService.update(byDropbox.id!, { isActive: true });
            }
            return byDropbox;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                dropboxId: profile.dropboxId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('dropboxOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            dropboxId: profile.dropboxId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateCoinbaseUser(
        profile: CoinbaseProfilePayload,
    ): Promise<IUser> {
        const byCoinbase = await this.usersService.findByCoinbaseId(
            profile.coinbaseId,
        );
        if (byCoinbase) {
            if (!byCoinbase.isActive) {
                return this.usersService.update(byCoinbase.id!, { isActive: true });
            }
            return byCoinbase;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                coinbaseId: profile.coinbaseId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('coinbaseOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            coinbaseId: profile.coinbaseId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateActiveDirectoryUser(
        profile: ActiveDirectoryProfilePayload,
    ): Promise<IUser> {
        const byAd = await this.usersService.findByActiveDirectoryId(
            profile.activeDirectoryId,
        );
        if (byAd) {
            if (!byAd.isActive) {
                return this.usersService.update(byAd.id!, { isActive: true });
            }
            return byAd;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                activeDirectoryId: profile.activeDirectoryId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('adLdap.defaultRoles') ?? [];
        const usernameBase =
            profile.samAccountName ?? profile.email.split('@')[0];
        const username = await this.buildUniqueUsername(usernameBase);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            activeDirectoryId: profile.activeDirectoryId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateMetamaskUser(
        profile: { metamaskId: string; email: string },
    ): Promise<IUser> {
        const byMetamask = await this.usersService.findByMetamaskId(
            profile.metamaskId,
        );
        if (byMetamask) {
            if (!byMetamask.isActive) {
                return this.usersService.update(byMetamask.id!, {
                    isActive: true,
                });
            }
            return byMetamask;
        }

        const defaultRoles =
            this.configService.get<Role[]>('metamaskAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);
        const { firstName, lastName } = generateRandomDisplayName();

        return this.usersService.create({
            email: profile.email,
            firstName,
            lastName: lastName || '-',
            username,
            metamaskId: profile.metamaskId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateSteamUser(
        profile: SteamProfilePayload,
    ): Promise<IUser> {
        const bySteam = await this.usersService.findBySteamId(profile.steamId);
        if (bySteam) {
            if (!bySteam.isActive) {
                return this.usersService.update(bySteam.id!, { isActive: true });
            }
            return bySteam;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                steamId: profile.steamId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('steamOpenId.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            steamId: profile.steamId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateRedditUser(
        profile: RedditProfilePayload,
    ): Promise<IUser> {
        const byReddit = await this.usersService.findByRedditId(profile.redditId);
        if (byReddit) {
            if (!byReddit.isActive) {
                return this.usersService.update(byReddit.id!, { isActive: true });
            }
            return byReddit;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                redditId: profile.redditId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('redditOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            redditId: profile.redditId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async findOrCreateAppleUser(
        profile: AppleProfilePayload,
    ): Promise<IUser> {
        const byApple = await this.usersService.findByAppleId(profile.appleId);
        if (byApple) {
            if (!byApple.isActive) {
                return this.usersService.update(byApple.id!, { isActive: true });
            }
            return byApple;
        }

        const byEmail = await this.usersService.findByEmail(profile.email);
        if (byEmail) {
            return this.usersService.update(byEmail.id!, {
                appleId: profile.appleId,
                isActive: true,
            });
        }

        const defaultRoles =
            this.configService.get<Role[]>('appleOAuth.defaultRoles') ?? [];
        const username = await this.buildUniqueUsername(profile.email);

        return this.usersService.create({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName || '-',
            username,
            appleId: profile.appleId,
            isActive: true,
            roles: [...defaultRoles],
        });
    }

    private async buildUniqueUsername(email: string): Promise<string> {
        const local =
            email
                .split('@')[0]
                .toLowerCase()
                .replace(/[^a-z0-9._-]/g, '')
                .slice(0, 24) || 'user';

        for (let attempt = 0; attempt < 20; attempt++) {
            const candidate =
                attempt === 0 ? local : `${local}${randomBytes(2).toString('hex')}`;
            const taken = await this.usersService.findByUsername(candidate);
            if (!taken) {
                return candidate;
            }
        }

        return `${local}${Date.now().toString(36)}`;
    }

    /**
     * Generate access and refresh tokens for a user
     * @param user - User to generate tokens for
     * @returns Access token and refresh token
     */
    private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = { id: user.id, email: user.email, roles: user.roles };
        const jitterSeconds = this.configService.get<number>('jwt.jitterSeconds') ?? 0;

        // Generate access token (base TTL + random jitter)
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.secret'),
            expiresIn: withJitter(
                this.configService.get<string>('jwt.expirationTime') ?? '1h',
                jitterSeconds,
            ),
        });

        // Generate refresh token (base TTL + random jitter)
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: withJitter(
                this.configService.get<string>('jwt.refreshExpirationTime') ?? '7d',
                jitterSeconds,
            ),
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Remove sensitive data from user object
     * @param user - User object to sanitize
     * @returns Sanitized user object
     */
    private sanitizeUser(user: IUser): Partial<IUser> {
        const { password, ...sanitizedUser } = user as any;
        return sanitizedUser;
    }

}