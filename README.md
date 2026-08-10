# Backend NestJS

NestJS template with REST + GraphQL, JWT authentication, on-prem Active Directory login (LDAP/LDAPS), and social login (Google / Facebook / X Twitter / GitHub / Figma / LinkedIn / Slack / Atlassian / GitLab / Bitbucket / Discord / Twitch / Amazon / Patreon / Dropbox / MetaMask / Steam / Apple), Redis cache, Kafka, MinIO, email (SMTP/MailHog), and structured logging via **Graylog** (GELF).

## Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** (TypeORM) — default persistence for the `users` module
- **MongoDB** (Mongoose) — repository available; CQRS-ready stack
- Redis, Apache Kafka, MinIO
- Graylog + OpenSearch (logs)
- Health checks with `@nestjs/terminus` at `GET /health`
- **Jest** — unit tests, global coverage (≥ 80%), and Husky pre-commit hook

## Persistence and CQRS-ready

Data access uses the **Repository pattern**. Today `UsersService` reads and writes to **PostgreSQL**. `UserMongoRepository` remains in the project: you can use Mongo only, Postgres only, or enable CQRS (commands in one database, queries in the other, with optional Kafka sync). Details are in the [architecture wiki](/architecture) after the API is up.

## Authentication

- JWT (login/register, refresh, roles, and guards)
- On-prem Active Directory (LDAP/LDAPS bind against AD DS on the DC) — `POST /auth/ad/login`, guides at [/auth/active-directory](/auth/active-directory), [/auth/active-directory/ldap](/auth/active-directory/ldap), [/auth/active-directory/ldaps](/auth/active-directory/ldaps)
- Social login via OAuth2 (Google, Facebook, X / Twitter, GitHub, Figma, LinkedIn, Slack, Atlassian, GitLab, Bitbucket, Discord, Twitch, Amazon, Patreon, Dropbox), MetaMask SIWE (EIP-4361), Steam OpenID 2.0, and Apple Sign In (OIDC form_post) with a *code exchange* flow (PKCE on Twitter)
- Wiki guides: [/auth](/auth), [/auth/active-directory](/auth/active-directory), [/auth/social](/auth/social), [/auth/social/google](/auth/social/google), [/auth/social/facebook](/auth/social/facebook), [/auth/social/twitter](/auth/social/twitter), [/auth/social/github](/auth/social/github), [/auth/social/figma](/auth/social/figma), [/auth/social/linkedin](/auth/social/linkedin), [/auth/social/slack](/auth/social/slack), [/auth/social/atlassian](/auth/social/atlassian), [/auth/social/gitlab](/auth/social/gitlab), [/auth/social/bitbucket](/auth/social/bitbucket), [/auth/social/discord](/auth/social/discord), [/auth/social/twitch](/auth/social/twitch), [/auth/social/amazon](/auth/social/amazon), [/auth/social/patreon](/auth/social/patreon), [/auth/social/dropbox](/auth/social/dropbox), [/auth/social/metamask](/auth/social/metamask), [/auth/social/steam](/auth/social/steam), [/auth/social/apple](/auth/social/apple)

## Tests and coverage

```bash
npm test              # unit suite
npm run test:watch    # watch mode
npm run test:cov      # tests + coverage (global 80% threshold)
```

The Husky pre-commit hook runs `npm run test:cov` and blocks the commit if tests fail or coverage drops below 80%. Details in the wiki: [/tests](/tests).

## Quickstart (Docker)

Requirement: Docker + Docker Compose.

```bash
# Full stack (API + DBs + Kafka + MinIO + MailHog + Graylog)
docker compose --env-file .env.docker up -d --build

# Status
docker compose --env-file .env.docker ps

# API logs
docker compose --env-file .env.docker logs -f api
```

The `Dockerfile` is multi-stage (deps → build → runner) and runs a `HEALTHCHECK` against `/health`. Containers use stable `container_name` values (e.g. `nestjs-backend-api`).

### Useful URLs

| Service | Path / URL |
|---------|------------|
| Wiki | [/](/) |
| Swagger | [/swagger](/swagger) |
| REST API | [/api/v1](/api/v1) (`API_VERSION`) |
| Health | [/health](/health) |
| GraphQL | [/graphql](/graphql) |
| MailHog UI | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| Graylog UI | http://localhost:9009 |

## Local development (without Docker for the API)

1. Copy `.env.example` to `.env` and adjust the variables (`API_VERSION`, Graylog: `GRAYLOG_*`, social OAuth if you use it).
2. Start the dependencies (or use Compose for infra services only).
3. `npm install && npm run start:dev`

Full install guide: wiki at [/backend/install](/backend/install) (after the API is running).

## Documentation

- Swagger: `/swagger`
- Built-in wiki: `/` (overview, architecture, backend guide, JWT auth, social login, tests)
- REST routes: `/api/{API_VERSION}/...` (default `v1`)

## Contributing

Contributions are welcome. Suggested flow:

1. Fork the repository and clone your fork.
2. Create a branch from `main` (`git checkout -b feature/my-change`).
3. Set up the environment (`npm install`; `.env` from `.env.example`).
4. Implement the change following project patterns (NestJS modules, DTOs, repositories).
5. Add unit tests (`*.spec.ts`) for new or changed code.
6. Run `npm run test:cov` and ensure the suite passes with global coverage ≥ 80%.
7. Open a Pull Request describing the problem, the solution, and how to test.

The Husky pre-commit hook runs `npm run test:cov` automatically; commits with failing tests or coverage below the threshold are rejected. Full guide: [/tests](/tests).

By contributing, you agree that the code will be distributed under [GPL-3.0](./LICENSE).

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE) (GPL-3.0).
