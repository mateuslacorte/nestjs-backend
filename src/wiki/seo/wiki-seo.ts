/**
 * Wiki SEO / Open Graph (descriptions always in English).
 * Keywords include English and Portuguese terms.
 */
export const WIKI_SEO = {
    siteName: 'NestJS Boilerplate',
    author: 'Mateus M. Côrtes',
    twitterCard: 'summary_large_image' as const,
    /** Default OG image (wiki preview). */
    images: {
        default: {
            path: '/static/og/default.jpg',
            width: 1024,
            height: 537,
            alt: 'NestJS Boilerplate documentation wiki',
        },
        blog: {
            path: '/static/og/blog.jpg',
            width: 1024,
            height: 537,
            alt: 'NestJS Boilerplate — development overview',
        },
        twitter: {
            path: '/static/og/x.jpg',
            width: 1024,
            height: 341,
            alt: 'NestJS Boilerplate',
        },
    },
    keywords: [
        // English
        'NestJS',
        'NestJS boilerplate',
        'NestJS starter',
        'NestJS template',
        'Node.js',
        'Node.js API',
        'NestJS API',
        'build APIs with NestJS',
        'develop APIs with Node.js',
        'TypeScript backend',
        'REST API',
        'GraphQL API',
        'JWT authentication',
        'backend architecture',
        'Docker NestJS',
        // Portuguese
        'boilerplate NestJS',
        'template NestJS',
        'desenvolver API',
        'desenvolver API com NestJS',
        'desenvolver API com Node.js',
        'API NestJS',
        'API Node.js',
        'backend NestJS',
        'criar API NestJS',
        'autenticação JWT',
        'arquitetura backend',
    ].join(', '),
    defaultDescription:
        'NestJS Boilerplate — a production-ready NestJS starter to build scalable Node.js APIs with REST, GraphQL, JWT auth, Redis, Kafka, MongoDB, PostgreSQL, and Docker.',
    pages: {
        home: {
            description:
                'NestJS Boilerplate documentation: learn how to build APIs with NestJS and Node.js using a complete TypeScript backend template with JWT, Redis, Kafka, and Docker.',
        },
        architecture: {
            description:
                'Architecture overview of the NestJS Boilerplate — request flow, cache, persistence (MongoDB/PostgreSQL), CQRS-ready repositories, and how NestJS integrates with Redis, Kafka, and Graylog.',
        },
        backend: {
            description:
                'Backend guide for the NestJS Boilerplate: modules, installation paths, and how to extend this NestJS / Node.js API template.',
        },
        'backend-install': {
            description:
                'Install and configure the NestJS Boilerplate — environment variables, Docker stack, health checks, and running your NestJS Node.js API locally.',
        },
        auth: {
            description:
                'JWT authentication and authorization in the NestJS Boilerplate — login, refresh tokens, roles, guards, and best practices for securing NestJS APIs.',
        },
        'auth-social': {
            description:
                'Developer guide to social login — Code Exchange flow, enabling providers, and integrating web or mobile clients.',
        },
        'auth-social-google': {
            description:
                'Google OAuth2 Code Exchange guide for the NestJS Boilerplate — setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-facebook': {
            description:
                'Facebook OAuth2 Code Exchange guide for the NestJS Boilerplate — Meta app setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-twitter': {
            description:
                'X / Twitter OAuth2 Code Exchange guide for the NestJS Boilerplate — Developer Portal setup, PKCE, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-github': {
            description:
                'GitHub OAuth2 Code Exchange guide for the NestJS Boilerplate — OAuth App setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-figma': {
            description:
                'Figma OAuth2 Code Exchange guide for the NestJS Boilerplate — OAuth app setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-linkedin': {
            description:
                'LinkedIn OpenID Connect Code Exchange guide for the NestJS Boilerplate — Sign In with LinkedIn setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-slack': {
            description:
                'Slack OpenID Connect Code Exchange guide for the NestJS Boilerplate — Sign in with Slack setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-atlassian': {
            description:
                'Atlassian OAuth 2.0 (3LO) Code Exchange guide for the NestJS Boilerplate — Atlassian OAuth app setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-gitlab': {
            description:
                'GitLab OAuth2 Code Exchange guide for the NestJS Boilerplate — GitLab OAuth application setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-bitbucket': {
            description:
                'Bitbucket OAuth2 Code Exchange guide for the NestJS Boilerplate — Bitbucket OAuth consumer setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-discord': {
            description:
                'Discord OAuth2 Code Exchange guide for the NestJS Boilerplate — Discord application setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-twitch': {
            description:
                'Twitch OAuth2 Code Exchange guide for the NestJS Boilerplate — Twitch Developer Console setup, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-steam': {
            description:
                'Steam OpenID 2.0 Code Exchange guide for the NestJS Boilerplate — Steam Web API key (optional), OpenID login setup, no email from Steam, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-reddit': {
            description:
                'Reddit OAuth2 Code Exchange guide for the NestJS Boilerplate — Reddit app preferences setup, identity scope, no email from Reddit, HTTP Basic token exchange, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-amazon': {
            description:
                'Login with Amazon Code Exchange guide for the NestJS Boilerplate — Security Profile setup, Authorization Code flow, profile scope, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-microsoft': {
            description:
                'Microsoft Entra ID / Azure AD Code Exchange guide for the NestJS Boilerplate — app registration, Microsoft Graph User.Read, tenant configuration, API endpoints, and web/mobile frontend examples.',
        },
        'auth-social-patreon': {
            description:
                'Patreon OAuth2 Code Exchange guide for the NestJS Boilerplate — developer portal setup, identity scopes, API v2 identity endpoint, and web/mobile frontend examples.',
        },
        'auth-social-dropbox': {
            description:
                'Dropbox OAuth2 Code Exchange guide for the NestJS Boilerplate — App Console setup, account_info.read scope, get_current_account endpoint, and web/mobile frontend examples.',
        },
        'auth-social-coinbase': {
            description:
                'Coinbase OAuth2 Code Exchange guide for the NestJS Boilerplate — Developer Portal setup, wallet:user:email and wallet:user:read scopes, GET /v2/user endpoint, and web/mobile frontend examples.',
        },
        'auth-social-metamask': {
            description:
                'MetaMask Sign-In with Ethereum (SIWE / EIP-4361) guide for the NestJS Boilerplate — nonce issuance, personal_sign verification, JWT contract, and browser samples.',
        },
        'auth-active-directory': {
            description:
                'Active Directory LDAP/LDAPS login guide for the NestJS Boilerplate — on-prem AD DS bind authentication, auto-provisioning, JWT contract, and environment configuration.',
        },
        'auth-active-directory-ldap': {
            description:
                'LDAP (port 389) setup for Active Directory authentication in the NestJS Boilerplate — domain controller URL, service account bind, and firewall guidance.',
        },
        'auth-active-directory-ldaps': {
            description:
                'LDAPS (port 636) setup for Active Directory authentication in the NestJS Boilerplate — TLS certificates, AD_LDAP_TLS_REJECT_UNAUTHORIZED, and production hardening.',
        },
        'auth-social-apple': {
            description:
                'Sign in with Apple guide for the NestJS Boilerplate — Apple Developer console setup, JWT client secret, form_post POST callback, first-login name capture, private relay email, API endpoints, and web/mobile frontend examples.',
        },
        users: {
            description:
                'Users module in the NestJS Boilerplate — CRUD patterns, repository design, and CQRS-ready persistence for NestJS / Node.js APIs.',
        },
        email: {
            description:
                'Email module in the NestJS Boilerplate — send transactional emails from your NestJS API with SMTP configuration and authenticated endpoints.',
        },
        whatsapp: {
            description:
                'WhatsApp integration in the NestJS Boilerplate — send messages from a NestJS API using Evolution API and JWT-protected routes.',
        },
        security: {
            description:
                'Security module in the NestJS Boilerplate — invalid-route protection, IP blocking, and hardening patterns for NestJS / Node.js APIs.',
        },
        tests: {
            description:
                'Testing guide — Jest unit tests, 97% branches/functions and 80% lines/statements coverage baseline, coverage reports, and the Husky pre-commit quality gate.',
        },
        websocket: {
            description:
                'WebSocket guide for the NestJS Boilerplate — Socket.IO gateway, JWT handshake, and realtime messaging patterns in NestJS APIs.',
        },
        wsui: {
            description:
                'Interactive WebSocket playground for the NestJS Boilerplate — test Socket.IO messages with a JWT session against the local gateway.',
        },
        'error-404': {
            description:
                'Page not found — NestJS Boilerplate API documentation.',
        },
        'error-500': {
            description:
                'Internal server error — NestJS Boilerplate API documentation.',
        },
    } as Record<string, { description: string }>,
} as const;

export type WikiSeoPageKey = keyof typeof WIKI_SEO.pages;
