# Backend NestJS

Template NestJS com REST + GraphQL, autenticação JWT e login social (Google / Facebook / X Twitter), cache Redis, Kafka, MinIO, email (SMTP/MailHog) e logging estruturado via **Graylog** (GELF).

## Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** (TypeORM) — persistência padrão do módulo `users`
- **MongoDB** (Mongoose) — repositório disponível; stack CQRS-ready
- Redis, Apache Kafka, MinIO
- Graylog + OpenSearch (logs)
- Health checks com `@nestjs/terminus` em `GET /health`
- **Jest** — testes unitários, coverage global (≥ 80%) e pre-commit com Husky

## Persistência e CQRS-ready

O acesso a dados usa **Repository pattern**. Hoje o `UsersService` lê e escreve no **PostgreSQL**. O `UserMongoRepository` permanece no projeto: você pode usar só Mongo, só Postgres, ou ativar CQRS (commands em um banco, queries no outro, com sync opcional via Kafka). Detalhes na [wiki de arquitetura](/architecture) após subir a API.

## Autenticação

- JWT (login/registro, refresh, roles e guards)
- Login social via OAuth2 (Google, Facebook e X / Twitter) com fluxo de *code exchange* (PKCE no Twitter)
- Guias na wiki: [/auth](/auth), [/auth/social](/auth/social), [/auth/social/google](/auth/social/google), [/auth/social/facebook](/auth/social/facebook), [/auth/social/twitter](/auth/social/twitter)

## Testes e coverage

```bash
npm test              # suíte unitária
npm run test:watch    # watch mode
npm run test:cov      # testes + coverage (limiar global 80%)
```

O pre-commit (Husky) executa `npm run test:cov` e bloqueia o commit se os testes falharem ou a coverage cair abaixo de 80%. Detalhes na wiki: [/tests](/tests).

## Quickstart (Docker)

Requisito: Docker + Docker Compose.

```bash
# Stack completo (API + DBs + Kafka + MinIO + MailHog + Graylog)
docker compose --env-file .env.docker up -d --build

# Status
docker compose --env-file .env.docker ps

# Logs da API
docker compose --env-file .env.docker logs -f api
```

O `Dockerfile` é multi-stage (deps → build → runner) e faz `HEALTHCHECK` em `/health`. Os containers usam `container_name` estáveis (ex.: `nestjs-backend-api`).

### URLs úteis

| Serviço | Path / URL |
|---------|------------|
| Wiki | [/](/) |
| Swagger | [/swagger](/swagger) |
| API REST | [/api/v1](/api/v1) (`API_VERSION`) |
| Health | [/health](/health) |
| GraphQL | [/graphql](/graphql) |
| MailHog UI | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| Graylog UI | http://localhost:9009 |

## Desenvolvimento local (sem Docker da API)

1. Copie `.env.example` para `.env` e ajuste as variáveis (`API_VERSION`, Graylog: `GRAYLOG_*`, OAuth social se for usar).
2. Suba as dependências (ou use o Compose só dos serviços de infra).
3. `npm install && npm run start:dev`

Guia completo de instalação: wiki em [/backend/install](/backend/install) (após a API estar no ar).

## Documentação

- Swagger: `/swagger`
- Wiki embutida: `/` (visão geral, arquitetura, guia backend, auth JWT, login social, testes)
- Rotas REST: `/api/{API_VERSION}/...` (default `v1`)

## Como contribuir

Contribuições são bem-vindas. Fluxo sugerido:

1. Faça um fork do repositório e clone o seu fork.
2. Crie uma branch a partir de `main` (`git checkout -b feature/minha-mudanca`).
3. Configure o ambiente (`npm install`; `.env` a partir de `.env.example`).
4. Implemente a mudança seguindo os padrões do projeto (módulos NestJS, DTOs, repositories).
5. Inclua testes unitários (`*.spec.ts`) para o código novo ou alterado.
6. Rode `npm run test:cov` e garanta que a suíte passa e a coverage global permanece ≥ 80%.
7. Abra um Pull Request descrevendo o problema, a solução e como testar.

O pre-commit (Husky) roda `npm run test:cov` automaticamente; commits com testes falhando ou coverage abaixo do limiar serão rejeitados. Guia completo: [/tests](/tests).

Ao contribuir, você concorda que o código será distribuído sob a [GPL-3.0](./LICENSE).

## Licença

Este projeto está sob a [GNU General Public License v3.0](./LICENSE) (GPL-3.0).
