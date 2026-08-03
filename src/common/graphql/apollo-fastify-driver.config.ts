import { ApolloServerOptionsWithSchema } from '@apollo/server';
import { GqlModuleOptions } from '@nestjs/graphql';

/**
 * Nest GraphQL options for the in-house Apollo Server 5 + Fastify driver.
 * Uses Apollo Sandbox (landing page) instead of the deprecated GraphQL Playground.
 * CORS is handled by Nest `enableCors` on the Fastify adapter (not per-path middleware).
 */
export type ApolloFastifyDriverConfig = GqlModuleOptions &
    Omit<
        ApolloServerOptionsWithSchema<any>,
        'typeDefs' | 'schema' | 'resolvers' | 'gateway'
    > & {
        path?: string;
        playground?: boolean;
        autoTransformHttpErrors?: boolean;
        preserveHttpStatusForExecutionErrors?: boolean;
    };
