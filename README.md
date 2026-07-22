# Backend NestJS

Template NestJS com REST + GraphQL, autenticação JWT, cache Redis, Kafka, MinIO, email (SMTP/MailHog) e logging estruturado via **Graylog** (GELF).

## Stack

- **NestJS 11** + TypeScript
- **PostgreSQL** (TypeORM) — persistência padrão do módulo `users`
- **MongoDB** (Mongoose) — repositório disponível; stack CQRS-ready
- Redis, Apache Kafka, MinIO
- Graylog + OpenSearch (logs)
- Health checks com `@nestjs/terminus` em `GET /health`

## Persistência e CQRS-ready

O acesso a dados usa **Repository pattern**. Hoje o `UsersService` lê e escreve no **PostgreSQL**. O `UserMongoRepository` permanece no projeto: você pode usar só Mongo, só Postgres, ou ativar CQRS (commands em um banco, queries no outro, com sync opcional via Kafka). Detalhes na [wiki de arquitetura](/architecture) após subir a API.

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

1. Copie `.env.example` para `.env` e ajuste as variáveis (`API_VERSION`, Graylog: `GRAYLOG_*`).
2. Suba as dependências (ou use o Compose só dos serviços de infra).
3. `npm install && npm run start:dev`

Guia completo de instalação: wiki em [/backend/install](/backend/install) (após a API estar no ar).

## Documentação

- Swagger: `/swagger`
- Wiki embutida: `/` (visão geral, arquitetura, guia backend, auth)
- Rotas REST: `/api/{API_VERSION}/...` (default `v1`)
