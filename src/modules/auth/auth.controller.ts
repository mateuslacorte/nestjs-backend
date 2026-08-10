import {Controller, Post, Body, Req, Res, UseGuards, Get, Query, HttpCode, HttpStatus} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { TwitterAuthGuard } from './guards/twitter-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { FigmaAuthGuard } from './guards/figma-auth.guard';
import { LinkedinAuthGuard } from './guards/linkedin-auth.guard';
import { SlackAuthGuard } from './guards/slack-auth.guard';
import { AtlassianAuthGuard } from './guards/atlassian-auth.guard';
import { GitlabAuthGuard } from './guards/gitlab-auth.guard';
import { BitbucketAuthGuard } from './guards/bitbucket-auth.guard';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { SteamAuthGuard } from './guards/steam-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { AmazonAuthGuard } from './guards/amazon-auth.guard';
import { PatreonAuthGuard } from './guards/patreon-auth.guard';
import { DropboxAuthGuard } from './guards/dropbox-auth.guard';
import { AppRequest, AppReply } from '@common/http/app-http';
import { sendOAuthClientRedirect } from './utils/oauth-client-redirect';
import {ApiTags, ApiResponse, ApiBody, ApiBearerAuth, ApiOperation, ApiQuery} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { Audit } from '@common/audit/decorators/audit.decorator';
import {ForgotPasswordDto} from "./dtos/forgot-password.dto";
import {ResetPasswordDto} from "./dtos/reset-password.dto";
import {RefreshtokenDto} from "@modules/auth/dtos/refreshtoken.dto";
import {ChangePasswordDto} from "./dtos/change-password.dto";
import { ExchangeCodeDto } from './dtos/exchange-code.dto';
import { AdLoginDto } from './dtos/ad-login.dto';
import { MetamaskVerifyDto } from './dtos/metamask-verify.dto';
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
import { AppleProfilePayload } from './strategies/apple.strategy';
import { AmazonProfilePayload } from './strategies/amazon.strategy';
import { PatreonProfilePayload } from './strategies/patreon.strategy';
import { DropboxProfilePayload } from './strategies/dropbox.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Register a new user
     * @param createUserDto - User data to register
     * @returns The registered user
     */
    @Public()
    @Audit({
        action: 'auth.register',
        category: 'auth',
        description: 'User registration attempt',
        identifierFrom: 'email',
        userIdFrom: 'user.id',
    })
    @Post('register')
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 409, description: 'Conflict - email or username already exists.' })
    @ApiBody({
        type: RegisterDto,
        description: 'User registration data',
        examples: {
            userRegistration: {
                summary: 'User Registration Example',
                description: 'A sample user registration request',
                value: {
                    firstName: "Jane",
                    lastName: "Smith",
                    username: "janesmith",
                    email: "jane.smith@example.com",
                    password: "Str0ng!P@ssword",
                    confirmPassword: "Str0ng!P@ssword",
                }
            }
        }
    })
    async register(
        @Body() createUserDto: RegisterDto,
    ) {
        return await this.authService.register(createUserDto);
    }

    /**
     * Login a user
     * @param loginDto - User data to login
     * @returns The logged in user
     */
    @Public()
    @Audit({
        action: 'auth.login',
        category: 'auth',
        description: 'Email/password login attempt',
        identifierFrom: 'email',
        userIdFrom: 'user.id',
    })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    @ApiBody({
        type: LoginDto,
        description: 'User login credentials',
        examples: {
            userLogin: {
                summary: 'User Login Example',
                description: 'A sample user login request',
                value: {
                    email: 'john.doe@example.com',
                    password: 'StrongP@ssw0rd123'
                }
            }
        }
    })
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    /**
     * Login with on-prem Active Directory (LDAP/LDAPS).
     */
    @Public()
    @Audit({
        action: 'auth.ad.login',
        category: 'auth',
        description: 'Active Directory login attempt',
        identifierFrom: 'username',
        userIdFrom: 'user.id',
    })
    @Post('ad/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Login with Active Directory (LDAP/LDAPS)',
        description:
            'Authenticates against on-prem AD DS via LDAP bind. Returns JWT tokens (same contract as POST /auth/login). Disabled when AD_LDAP_ENABLED=false (503).',
    })
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    @ApiResponse({
        status: 503,
        description: 'Active Directory authentication is disabled or unavailable.',
    })
    @ApiBody({
        type: AdLoginDto,
        description: 'Active Directory credentials',
        examples: {
            adLogin: {
                summary: 'AD Login Example',
                description: 'sAMAccountName or userPrincipalName',
                value: {
                    username: 'jdoe',
                    password: 'StrongP@ssw0rd123',
                },
            },
        },
    })
    async adLogin(@Body() adLoginDto: AdLoginDto) {
        return await this.authService.loginWithActiveDirectory(adLoginDto);
    }

    /**
     * Issue a SIWE nonce for MetaMask Sign-In with Ethereum.
     */
    @Public()
    @Post('metamask/nonce')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Issue MetaMask SIWE nonce',
        description:
            'Returns a one-time nonce (stored in Redis) for building an EIP-4361 SIWE message. Disabled when METAMASK_AUTH_ENABLED=false (503).',
    })
    @ApiResponse({ status: 200, description: 'Nonce issued.' })
    @ApiResponse({
        status: 503,
        description: 'MetaMask authentication is disabled.',
    })
    async metamaskNonce() {
        return await this.authService.issueMetamaskNonce();
    }

    /**
     * Verify MetaMask SIWE message + signature and return JWT tokens.
     */
    @Public()
    @Audit({
        action: 'auth.metamask.verify',
        category: 'auth',
        description: 'MetaMask SIWE login attempt',
        userIdFrom: 'user.id',
    })
    @Post('metamask/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify MetaMask SIWE login',
        description:
            'Validates the SIWE message and signature, upserts the user by Ethereum address, and returns JWT tokens (same contract as POST /auth/login). Disabled when METAMASK_AUTH_ENABLED=false (503).',
    })
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 400, description: 'Invalid SIWE message.' })
    @ApiResponse({ status: 401, description: 'Invalid signature or nonce.' })
    @ApiResponse({
        status: 503,
        description: 'MetaMask authentication is disabled.',
    })
    @ApiBody({ type: MetamaskVerifyDto })
    async metamaskVerify(@Body() dto: MetamaskVerifyDto) {
        return await this.authService.loginWithMetamask(dto);
    }

    /**
     * Start Google OAuth2 (Authorization Code). Redirects to Google consent screen.
     */
    @Public()
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Start Google OAuth2 login',
        description:
            'Redirects the browser to Google. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when GOOGLE_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match GOOGLE_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Google OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Google authentication is disabled.' })
    googleAuth() {
        // Guard redirects to Google
    }

    /**
     * Google OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'google',
        description: 'Google OAuth callback — issue exchange code',
    })
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Google OAuth2 callback',
        description:
            'Processes the Google profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Google authentication is disabled.' })
    async googleAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as GoogleProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeGoogleOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Facebook OAuth2 (Authorization Code). Redirects to Meta consent screen.
     */
    @Public()
    @Get('facebook')
    @UseGuards(FacebookAuthGuard)
    @ApiOperation({
        summary: 'Start Facebook OAuth2 login',
        description:
            'Redirects the browser to Facebook. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when FACEBOOK_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match FACEBOOK_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Facebook OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Facebook authentication is disabled.' })
    facebookAuth() {
        // Guard redirects to Facebook
    }

    /**
     * Facebook OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'facebook',
        description: 'Facebook OAuth callback — issue exchange code',
    })
    @Get('facebook/callback')
    @UseGuards(FacebookAuthGuard)
    @ApiOperation({
        summary: 'Facebook OAuth2 callback',
        description:
            'Processes the Facebook profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Facebook authentication is disabled.' })
    async facebookAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as FacebookProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeFacebookOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start X / Twitter OAuth2 (Authorization Code + PKCE). Redirects to X consent screen.
     */
    @Public()
    @Get('twitter')
    @UseGuards(TwitterAuthGuard)
    @ApiOperation({
        summary: 'Start X / Twitter OAuth2 login',
        description:
            'Redirects the browser to X (Twitter). Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when TWITTER_AUTH_ENABLED=false (503). Requires a session cookie (SameSite=Lax) for PKCE.',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match TWITTER_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to X / Twitter OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Twitter authentication is disabled.' })
    twitterAuth() {
        // Guard redirects to X / Twitter
    }

    /**
     * X / Twitter OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'twitter',
        description: 'X / Twitter OAuth callback — issue exchange code',
    })
    @Get('twitter/callback')
    @UseGuards(TwitterAuthGuard)
    @ApiOperation({
        summary: 'X / Twitter OAuth2 callback',
        description:
            'Processes the Twitter profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Twitter authentication is disabled.' })
    async twitterAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as TwitterProfilePayload;
        // PKCE stores a random handle in query.state; the client redirect lives
        // on req.oauthState (set by TwitterAuthGuard.handleRequest).
        const state =
            req.oauthState ??
            (typeof req.query.state === 'string' ? req.query.state : undefined);
        const { redirectUrl } = await this.authService.completeTwitterOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start GitHub OAuth2 (Authorization Code). Redirects to GitHub consent screen.
     */
    @Public()
    @Get('github')
    @UseGuards(GithubAuthGuard)
    @ApiOperation({
        summary: 'Start GitHub OAuth2 login',
        description:
            'Redirects the browser to GitHub. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when GITHUB_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match GITHUB_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to GitHub OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'GitHub authentication is disabled.' })
    githubAuth() {
        // Guard redirects to GitHub
    }

    /**
     * GitHub OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'github',
        description: 'GitHub OAuth callback — issue exchange code',
    })
    @Get('github/callback')
    @UseGuards(GithubAuthGuard)
    @ApiOperation({
        summary: 'GitHub OAuth2 callback',
        description:
            'Processes the GitHub profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'GitHub authentication is disabled.' })
    async githubAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as GithubProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeGithubOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Figma OAuth2 (Authorization Code). Redirects to Figma consent screen.
     */
    @Public()
    @Get('figma')
    @UseGuards(FigmaAuthGuard)
    @ApiOperation({
        summary: 'Start Figma OAuth2 login',
        description:
            'Redirects the browser to Figma. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when FIGMA_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match FIGMA_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Figma OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Figma authentication is disabled.' })
    figmaAuth() {
        // Guard redirects to Figma
    }

    /**
     * Figma OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'figma',
        description: 'Figma OAuth callback — issue exchange code',
    })
    @Get('figma/callback')
    @UseGuards(FigmaAuthGuard)
    @ApiOperation({
        summary: 'Figma OAuth2 callback',
        description:
            'Processes the Figma profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Figma authentication is disabled.' })
    async figmaAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as FigmaProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeFigmaOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start LinkedIn OAuth2 / OpenID Connect. Redirects to LinkedIn consent screen.
     */
    @Public()
    @Get('linkedin')
    @UseGuards(LinkedinAuthGuard)
    @ApiOperation({
        summary: 'Start LinkedIn OAuth2 login',
        description:
            'Redirects the browser to LinkedIn. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when LINKEDIN_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match LINKEDIN_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to LinkedIn OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'LinkedIn authentication is disabled.' })
    linkedinAuth() {
        // Guard redirects to LinkedIn
    }

    /**
     * LinkedIn OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'linkedin',
        description: 'LinkedIn OAuth callback — issue exchange code',
    })
    @Get('linkedin/callback')
    @UseGuards(LinkedinAuthGuard)
    @ApiOperation({
        summary: 'LinkedIn OAuth2 callback',
        description:
            'Processes the LinkedIn profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'LinkedIn authentication is disabled.' })
    async linkedinAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as LinkedinProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeLinkedinOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Slack OAuth2 / OpenID Connect (Sign in with Slack). Redirects to Slack consent.
     */
    @Public()
    @Get('slack')
    @UseGuards(SlackAuthGuard)
    @ApiOperation({
        summary: 'Start Slack OAuth2 login',
        description:
            'Redirects the browser to Slack. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when SLACK_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match SLACK_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Slack OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Slack authentication is disabled.' })
    slackAuth() {
        // Guard redirects to Slack
    }

    /**
     * Slack OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'slack',
        description: 'Slack OAuth callback — issue exchange code',
    })
    @Get('slack/callback')
    @UseGuards(SlackAuthGuard)
    @ApiOperation({
        summary: 'Slack OAuth2 callback',
        description:
            'Processes the Slack profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Slack authentication is disabled.' })
    async slackAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as SlackProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeSlackOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Atlassian OAuth 2.0 (3LO). Redirects to Atlassian consent screen.
     */
    @Public()
    @Get('atlassian')
    @UseGuards(AtlassianAuthGuard)
    @ApiOperation({
        summary: 'Start Atlassian OAuth2 login',
        description:
            'Redirects the browser to Atlassian. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when ATLASSIAN_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match ATLASSIAN_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Atlassian OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Atlassian authentication is disabled.' })
    atlassianAuth() {
        // Guard redirects to Atlassian
    }

    /**
     * Atlassian OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'atlassian',
        description: 'Atlassian OAuth callback — issue exchange code',
    })
    @Get('atlassian/callback')
    @UseGuards(AtlassianAuthGuard)
    @ApiOperation({
        summary: 'Atlassian OAuth2 callback',
        description:
            'Processes the Atlassian profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Atlassian authentication is disabled.' })
    async atlassianAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as AtlassianProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeAtlassianOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start GitLab OAuth2 (Authorization Code). Redirects to GitLab consent screen.
     */
    @Public()
    @Get('gitlab')
    @UseGuards(GitlabAuthGuard)
    @ApiOperation({
        summary: 'Start GitLab OAuth2 login',
        description:
            'Redirects the browser to GitLab. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when GITLAB_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match GITLAB_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to GitLab OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'GitLab authentication is disabled.' })
    gitlabAuth() {
        // Guard redirects to GitLab
    }

    /**
     * GitLab OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'gitlab',
        description: 'GitLab OAuth callback — issue exchange code',
    })
    @Get('gitlab/callback')
    @UseGuards(GitlabAuthGuard)
    @ApiOperation({
        summary: 'GitLab OAuth2 callback',
        description:
            'Processes the GitLab profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'GitLab authentication is disabled.' })
    async gitlabAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as GitlabProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeGitlabOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Bitbucket OAuth2 (Authorization Code). Redirects to Bitbucket consent screen.
     */
    @Public()
    @Get('bitbucket')
    @UseGuards(BitbucketAuthGuard)
    @ApiOperation({
        summary: 'Start Bitbucket OAuth2 login',
        description:
            'Redirects the browser to Bitbucket. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when BITBUCKET_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match BITBUCKET_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Bitbucket OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Bitbucket authentication is disabled.' })
    bitbucketAuth() {
        // Guard redirects to Bitbucket
    }

    /**
     * Bitbucket OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'bitbucket',
        description: 'Bitbucket OAuth callback — issue exchange code',
    })
    @Get('bitbucket/callback')
    @UseGuards(BitbucketAuthGuard)
    @ApiOperation({
        summary: 'Bitbucket OAuth2 callback',
        description:
            'Processes the Bitbucket profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Bitbucket authentication is disabled.' })
    async bitbucketAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as BitbucketProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeBitbucketOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Discord OAuth2 (Authorization Code). Redirects to Discord consent screen.
     */
    @Public()
    @Get('discord')
    @UseGuards(DiscordAuthGuard)
    @ApiOperation({
        summary: 'Start Discord OAuth2 login',
        description:
            'Redirects the browser to Discord. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when DISCORD_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match DISCORD_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Discord OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Discord authentication is disabled.' })
    discordAuth() {
        // Guard redirects to Discord
    }

    /**
     * Discord OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'discord',
        description: 'Discord OAuth callback — issue exchange code',
    })
    @Get('discord/callback')
    @UseGuards(DiscordAuthGuard)
    @ApiOperation({
        summary: 'Discord OAuth2 callback',
        description:
            'Processes the Discord profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Discord authentication is disabled.' })
    async discordAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as DiscordProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeDiscordOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Twitch OAuth2 (Authorization Code). Redirects to Twitch consent screen.
     */
    @Public()
    @Get('twitch')
    @UseGuards(TwitchAuthGuard)
    @ApiOperation({
        summary: 'Start Twitch OAuth2 login',
        description:
            'Redirects the browser to Twitch. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when TWITCH_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match TWITCH_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Twitch OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Twitch authentication is disabled.' })
    twitchAuth() {
        // Guard redirects to Twitch
    }

    /**
     * Twitch OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'twitch',
        description: 'Twitch OAuth callback — issue exchange code',
    })
    @Get('twitch/callback')
    @UseGuards(TwitchAuthGuard)
    @ApiOperation({
        summary: 'Twitch OAuth2 callback',
        description:
            'Processes the Twitch profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Twitch authentication is disabled.' })
    async twitchAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as TwitchProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeTwitchOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Amazon Login with Amazon (Authorization Code). Redirects to Amazon consent screen.
     */
    @Public()
    @Get('amazon')
    @UseGuards(AmazonAuthGuard)
    @ApiOperation({
        summary: 'Start Amazon OAuth2 login',
        description:
            'Redirects the browser to Amazon. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when AMAZON_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match AMAZON_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Amazon OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Amazon authentication is disabled.' })
    amazonAuth() {
        // Guard redirects to Amazon
    }

    /**
     * Amazon OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'amazon',
        description: 'Amazon OAuth callback — issue exchange code',
    })
    @Get('amazon/callback')
    @UseGuards(AmazonAuthGuard)
    @ApiOperation({
        summary: 'Amazon OAuth2 callback',
        description:
            'Processes the Amazon profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Amazon authentication is disabled.' })
    async amazonAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as AmazonProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeAmazonOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }


    /**
     * Start Patreon OAuth2 (Authorization Code). Redirects to Patreon consent screen.
     */
    @Public()
    @Get('patreon')
    @UseGuards(PatreonAuthGuard)
    @ApiOperation({
        summary: 'Start Patreon OAuth2 login',
        description:
            'Redirects the browser to Patreon. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when PATREON_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match PATREON_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Patreon OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Patreon authentication is disabled.' })
    patreonAuth() {
        // Guard redirects to Patreon
    }

    /**
     * Patreon OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'patreon',
        description: 'Patreon OAuth callback — issue exchange code',
    })
    @Get('patreon/callback')
    @UseGuards(PatreonAuthGuard)
    @ApiOperation({
        summary: 'Patreon OAuth2 callback',
        description:
            'Processes the Patreon profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Patreon authentication is disabled.' })
    async patreonAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as PatreonProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completePatreonOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Dropbox OAuth2 (Authorization Code). Redirects to Dropbox consent screen.
     */
    @Public()
    @Get('dropbox')
    @UseGuards(DropboxAuthGuard)
    @ApiOperation({
        summary: 'Start Dropbox OAuth2 login',
        description:
            'Redirects the browser to Dropbox. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when DROPBOX_AUTH_ENABLED=false (503).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match DROPBOX_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Dropbox OAuth consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Dropbox authentication is disabled.' })
    dropboxAuth() {
        // Guard redirects to Dropbox
    }

    /**
     * Dropbox OAuth2 callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'dropbox',
        description: 'Dropbox OAuth callback — issue exchange code',
    })
    @Get('dropbox/callback')
    @UseGuards(DropboxAuthGuard)
    @ApiOperation({
        summary: 'Dropbox OAuth2 callback',
        description:
            'Processes the Dropbox profile, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Dropbox authentication is disabled.' })
    async dropboxAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as DropboxProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeDropboxOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Steam OpenID 2.0 login. Redirects to Steam sign-in.
     */
    @Public()
    @Get('steam')
    @UseGuards(SteamAuthGuard)
    @ApiOperation({
        summary: 'Start Steam OpenID login',
        description:
            'Redirects the browser to Steam OpenID. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when STEAM_AUTH_ENABLED=false (503). Steam does not provide email — a synthetic address is used.',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match STEAM_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Steam OpenID.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Steam authentication is disabled.' })
    steamAuth() {
        // Guard redirects to Steam
    }

    /**
     * Steam OpenID callback — issues a one-time exchange code and redirects to the client.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'steam',
        description: 'Steam OpenID callback — issue exchange code',
    })
    @Get('steam/callback')
    @UseGuards(SteamAuthGuard)
    @ApiOperation({
        summary: 'Steam OpenID callback',
        description:
            'Verifies the Steam OpenID assertion, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Steam authentication is disabled.' })
    async steamAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as SteamProfilePayload;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const { redirectUrl } = await this.authService.completeSteamOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Start Apple Sign In (OIDC form_post). Redirects to Apple consent screen.
     *
     * Note: Apple's callback is a POST (form_post response mode), not a GET.
     */
    @Public()
    @Get('apple')
    @UseGuards(AppleAuthGuard)
    @ApiOperation({
        summary: 'Start Apple Sign In',
        description:
            'Redirects the browser to Apple. Pass redirect (allowlisted) for the post-login deep link or web URL. Disabled when APPLE_AUTH_ENABLED=false (503). Apple delivers the callback as HTTP POST (form_post).',
    })
    @ApiQuery({
        name: 'redirect',
        required: false,
        description:
            'Post-login redirect URL (must match APPLE_REDIRECT_ALLOWLIST). Defaults to the first allowlist entry.',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Apple Sign In consent.' })
    @ApiResponse({ status: 400, description: 'Invalid or missing redirect.' })
    @ApiResponse({ status: 503, description: 'Apple authentication is disabled.' })
    appleAuth() {
        // Guard redirects to Apple
    }

    /**
     * Apple Sign In callback — Apple POSTs here (form_post response mode).
     *
     * Apple only sends the user's name on the very first successful login.
     * On subsequent logins only the id_token (sub + email) is available.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.callback',
        category: 'auth',
        provider: 'apple',
        description: 'Apple OAuth callback — issue exchange code',
    })
    @Post('apple/callback')
    @UseGuards(AppleAuthGuard)
    @ApiOperation({
        summary: 'Apple Sign In callback (POST, form_post)',
        description:
            'Apple POSTs to this endpoint after consent. Decodes id_token, upserts user, stores a short-lived single-use exchange code in Redis, and redirects to the client redirect URL with ?code=',
    })
    @ApiResponse({ status: 200, description: 'HTML redirect (location.replace) to client with exchange code — http(s) or deep link.' })
    @ApiResponse({ status: 503, description: 'Apple authentication is disabled.' })
    async appleAuthCallback(@Req() req: AppRequest, @Res() reply: AppReply) {
        const profile = req.user as AppleProfilePayload;
        const body = req.body as { state?: string } | undefined;
        const state = typeof body?.state === 'string' ? body.state : undefined;
        const { redirectUrl } = await this.authService.completeAppleOAuth(
            profile,
            state,
        );
        return sendOAuthClientRedirect(reply, redirectUrl);
    }

    /**
     * Exchange a one-time OAuth code for JWT tokens.
     */
    @Public()
    @Audit({
        action: 'auth.oauth.exchange',
        category: 'auth',
        description: 'OAuth/OpenID exchange code redeemed for JWT',
        userIdFrom: 'user.id',
    })
    @Post('exchange')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Exchange OAuth code for JWT tokens',
        description:
            'Consumes a one-time exchange code (60s TTL) from Google, Facebook, X / Twitter, GitHub, Figma, LinkedIn, Slack, Atlassian, GitLab, Bitbucket, Discord, Twitch, Steam, or Apple and returns accessToken, refreshToken, and user — same shape as login.',
    })
    @ApiBody({ type: ExchangeCodeDto })
    @ApiResponse({
        status: 200,
        description: 'Tokens issued.',
        schema: {
            type: 'object',
            properties: {
                user: { type: 'object' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired exchange code.' })
    @ApiResponse({ status: 503, description: 'Social authentication is disabled.' })
    async exchangeCode(@Body() dto: ExchangeCodeDto) {
        return this.authService.exchangeOAuthCode(dto);
    }

    /**
     * Verify a token
     * @param req - Request object
     * @returns The verified token
     */
    @Post('verify-token')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Verify access token',
        description: 'Validates the JWT access token and returns the authenticated user payload'
    })
    @ApiResponse({ status: 200, description: 'Token is valid.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - invalid or expired token.' })
    verifyToken(@Req() req: AppRequest) {
        return { message: 'Token is valid', user: req.user };
    }

    /**
     * Refresh a token
     * @param refreshTokenDto - Token data to refresh
     * @returns The refreshed token
     */
    @Public()
    @Audit({
        action: 'auth.refresh',
        category: 'auth',
        description: 'Refresh token rotation attempt',
    })
    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Use a valid refresh token to generate new access and refresh tokens'
    })
    @ApiResponse({
        status: 200,
        description: 'Tokens refreshed successfully.',
        schema: {
            type: 'object',
            properties: {
                accessToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2MTI3MjAwfQ.new_signature_here'
                },
                refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2NzI4NDAwfQ.new_refresh_signature_here'
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid refresh token.',
        schema: {
            type: 'object',
            properties: {
                statusCode: {
                    type: 'number',
                    example: 401
                },
                message: {
                    type: 'string',
                    example: 'Invalid refresh token'
                },
                error: {
                    type: 'string',
                    example: 'Unauthorized'
                }
            }
        }
    })
    @ApiBody({
        type: RefreshtokenDto,
        description: 'Refresh token data',
        examples: {
            refreshTokenExample: {
                summary: 'Refresh Token Example',
                description: 'A sample refresh token request',
                value: {
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2NzI4NDAwfQ.signature_here'
                }
            }
        }
    })
    async refreshToken(@Body() refreshTokenDto: RefreshtokenDto) {
        return await this.authService.refreshToken(refreshTokenDto);
    }

    /**
     * Forgot a password
     * @param forgotPasswordDto - Password data to forgot
     * @returns The forgot password
     */
    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Audit({
        action: 'auth.password.forgot',
        category: 'auth',
        description: 'Forgot password request',
        identifierFrom: 'email',
    })
    @ApiResponse({
        status: 200,
        description:
            'Generic success whether or not the email exists (anti-enumeration).',
    })
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const resetToken = await this.authService.createPasswordResetToken(
            forgotPasswordDto.email,
        );
        if (resetToken) {
            await this.authService.sendResetTokenEmail(
                forgotPasswordDto.email,
                resetToken,
            );
        }
        return { message: 'Password reset instructions sent to your email' };
    }

    /**
     * Reset a password
     * @param resetPasswordDto - Password data to reset
     * @returns The reset password
     */
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @Audit({
        action: 'auth.password.reset',
        category: 'auth',
        description: 'Reset password with token',
    })
    @ApiResponse({ status: 200, description: 'Password successfully reset.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ResetPasswordDto })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto);
        return { message: 'Password reset successfully' };
    }

    /**
     * Change a password
     * @param req - Request object
     * @param changePasswordDto - Password data to change
     * @returns The changed password
     */
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Audit({
        action: 'auth.password.change',
        category: 'auth',
        description: 'Change password for logged-in user',
    })
    @ApiOperation({ summary: 'Change password for logged-in user' })
    @ApiResponse({ status: 200, description: 'Password changed successfully.' })
    @ApiResponse({ status: 400, description: 'Current password is incorrect or passwords do not match.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - user is not logged in.' })
    @ApiBody({
        type: ChangePasswordDto,
        description: 'Password change data',
        examples: {
            changePassword: {
                summary: 'Password change example',
                description: 'Request to change the logged in user\'s password',
                value: {
                    currentPassword: 'CurrentPassword@123',
                    newPassword: 'NewPassword@456',
                    confirmNewPassword: 'NewPassword@456'
                }
            }
        }
    })
    async changePassword(@Req() req: AppRequest, @Body() changePasswordDto: ChangePasswordDto) {
        const user = req.user as any;
        return await this.authService.changePassword(user.id, changePasswordDto);
    }

    /**
     * Verify an email
     * @param token - Token to verify
     * @returns The verified email
     */
    @Public()
    @Get('verify-email')
    @Audit({
        action: 'auth.email.verify',
        category: 'auth',
        description: 'Verify email with token',
    })
    @ApiResponse({ status: 200, description: 'Email verified successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async verifyEmail(@Query('token') token: string) {
        const verified = await this.authService.verifyEmail(token);
        if (verified) {
            return { message: 'Email verified successfully. You can now login.' };
        }
    }

    /**
     * Resend a verification email
     * @param email - Email to resend
     * @returns The resend verification email
     */
    @Public()
    @HttpCode(HttpStatus.OK)
    @Audit({
        action: 'auth.email.resend',
        category: 'auth',
        description: 'Resend email verification',
        identifierFrom: 'email',
    })
    @ApiResponse({ status: 200, description: 'Verification email has been resent.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({
        type: String,
        description: 'Email address to resend verification',
        examples: {
            resendVerification: {
                summary: 'Resend Verification Email Example',
                description: 'A sample request to resend verification email',
                value: {
                    email: 'john.doe@example.com'
                }
            }
        }
    })
    @Post('resend-verification')
    async resendVerification(@Body('email') email: string) {
        const token = await this.authService.createEmailVerificationToken(email);
        await this.authService.sendEmailVerification(email, token);
        return { message: 'Email verification resent successfully' };
    }
}