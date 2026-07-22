import { ApolloServerOptionsWithSchema } from '@apollo/server';
import { GqlModuleOptions } from '@nestjs/graphql';

/**
 * Nest GraphQL options for the in-house Apollo Server 5 + Express driver.
 * Uses Apollo Sandbox (landing page) instead of the deprecated GraphQL Playground.
 */
export type ApolloExpressDriverConfig = GqlModuleOptions &
    Omit<
        ApolloServerOptionsWithSchema<any>,
        'typeDefs' | 'schema' | 'resolvers' | 'gateway'
    > & {
        path?: string;
        playground?: boolean;
        autoTransformHttpErrors?: boolean;
        preserveHttpStatusForExecutionErrors?: boolean;
    };
