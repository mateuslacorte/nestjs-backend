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
