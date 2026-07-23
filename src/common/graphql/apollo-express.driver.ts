import { HttpStatus, Injectable } from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { AbstractGraphQLDriver } from '@nestjs/graphql';
import { ApolloServer } from '@apollo/server';
import {
    ApolloServerErrorCode,
    unwrapResolverError,
} from '@apollo/server/errors';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import { GraphQLFormattedError, GraphQLSchema } from 'graphql';
import cors from 'cors';
import { ApolloExpressDriverConfig } from './apollo-express-driver.config';

const APOLLO_HTTP_EXCEPTION_CODES: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: ApolloServerErrorCode.BAD_REQUEST,
    [HttpStatus.UNPROCESSABLE_ENTITY]: ApolloServerErrorCode.BAD_USER_INPUT,
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
};

const NEST_ONLY_OPTION_KEYS = new Set([
    'path',
    'playground',
    'graphiql',
    'typeDefs',
    'resolvers',
    'schema',
    'installSubscriptionHandlers',
    'subscriptions',
    'autoTransformHttpErrors',
    'preserveHttpStatusForExecutionErrors',
    'fieldResolverEnhancers',
    'driver',
    'autoSchemaFile',
    'sortSchema',
    'definitions',
    'transformSchema',
    'transformAutoSchemaFile',
    'buildSchemaOptions',
    'include',
    'resolverValidationOptions',
    'directiveResolvers',
    'schemaDirectives',
    'schemaTransforms',
    'useGlobalPrefix',
    'context',
    'plugins',
    'cors',
]);

@Injectable()
export class ApolloExpressDriver extends AbstractGraphQLDriver<ApolloExpressDriverConfig> {
    private apolloServer?: ApolloServer;

    get instance(): ApolloServer | undefined {
        return this.apolloServer;
    }

    async start(options: ApolloExpressDriverConfig): Promise<void> {
        const httpAdapter = this.httpAdapterHost.httpAdapter;
        if (httpAdapter.getType() !== 'express') {
            throw new Error(
                `ApolloExpressDriver only supports Express (got: ${httpAdapter.getType()})`,
            );
        }

        const { path, schema } = options;
        if (!schema) {
            throw new Error('ApolloExpressDriver requires a GraphQL schema');
        }

        httpAdapter.use(path, (req: { body?: unknown }, _res: unknown, next: () => void) => {
            req.body = req.body ?? {};
            next();
        });

        const drainHttpServerPlugin = ApolloServerPluginDrainHttpServer({
            httpServer: httpAdapter.getHttpServer(),
        });

        const apolloOptions = this.omitNestKeys(options);
        const server = new ApolloServer({
            schema: schema as GraphQLSchema,
            ...apolloOptions,
            plugins: [...(options.plugins ?? []), drainHttpServerPlugin],
        });

        await server.start();

        const app = httpAdapter.getInstance();
        if (options.cors) {
            app.use(path, cors(options.cors));
        }
        app.use(
            path,
            expressMiddleware(server, {
                context: options.context as any,
            }),
        );

        this.apolloServer = server;
    }

    async stop(): Promise<void> {
        await this.apolloServer?.stop();
    }

    async mergeDefaultOptions(
        options: ApolloExpressDriverConfig,
    ): Promise<ApolloExpressDriverConfig> {
        const enableSandbox =
            options.playground === true ||
            (options.playground === undefined && process.env.NODE_ENV !== 'production');

        const landingPlugins = enableSandbox
            ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
            : [ApolloServerPluginLandingPageDisabled()];

        const merged = await super.mergeDefaultOptions(options, {
            path: '/graphql',
            fieldResolverEnhancers: [],
            stopOnTerminationSignals: false,
        });

        merged.plugins = [...(merged.plugins ?? []), ...landingPlugins];

        if (merged.preserveHttpStatusForExecutionErrors !== false) {
            merged.plugins = [
                ...(merged.plugins ?? []),
                this.createPreserveHttpStatusPlugin(),
            ];
        }

        this.wrapContextResolver(merged);
        this.wrapFormatErrorFn(merged);
        return merged;
    }

    private omitNestKeys(
        options: ApolloExpressDriverConfig,
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(options)) {
            if (!NEST_ONLY_OPTION_KEYS.has(key) && value !== undefined) {
                result[key] = value;
            }
        }
        return result;
    }

    private createPreserveHttpStatusPlugin() {
        return {
            async requestDidStart() {
                return {
                    async willSendResponse(requestContext: {
                        response?: {
                            body?: { kind?: string; singleResult?: object };
                            http?: { status?: number };
                        };
                    }) {
                        const body = requestContext.response?.body;
                        if (
                            body?.kind === 'single' &&
                            'data' in (body.singleResult ?? {}) &&
                            requestContext.response?.http
                        ) {
                            requestContext.response.http.status = 200;
                        }
                    },
                };
            },
        };
    }

    private wrapFormatErrorFn(options: ApolloExpressDriverConfig): void {
        if (options.autoTransformHttpErrors === false) {
            return;
        }

        const transformHttpErrorFn = this.createTransformHttpErrorFn();
        if (options.formatError) {
            const originalFormatError = options.formatError;
            options.formatError = (formattedError, err) => {
                const transformed = transformHttpErrorFn(formattedError, err);
                return originalFormatError(transformed, err);
            };
        } else {
            options.formatError = transformHttpErrorFn;
        }
    }

    private createTransformHttpErrorFn() {
        return (
            formattedError: GraphQLFormattedError,
            originalError: unknown,
        ): GraphQLFormattedError => {
            const exceptionRef = unwrapResolverError(originalError) as {
                response?: { statusCode?: number };
                status?: number;
                message?: string;
            };
            const isHttpException =
                exceptionRef?.response?.statusCode && exceptionRef?.status;
            if (!isHttpException) {
                return formattedError;
            }

            const httpStatus = exceptionRef.status as number;
            const code =
                httpStatus in APOLLO_HTTP_EXCEPTION_CODES
                    ? APOLLO_HTTP_EXCEPTION_CODES[httpStatus]
                    : ApolloServerErrorCode.INTERNAL_SERVER_ERROR;

            return {
                ...formattedError,
                message: exceptionRef.message ?? formattedError.message,
                extensions: {
                    ...formattedError.extensions,
                    code,
                    ...(code === ApolloServerErrorCode.INTERNAL_SERVER_ERROR
                        ? { status: httpStatus }
                        : {}),
                    ...(exceptionRef.response
                        ? { originalError: exceptionRef.response }
                        : {}),
                },
            };
        };
    }

    private wrapContextResolver(
        targetOptions: ApolloExpressDriverConfig,
        originalOptions: ApolloExpressDriverConfig = { ...targetOptions },
    ): void {
        if (!targetOptions.context) {
            targetOptions.context = async (contextOrRequest: { req?: unknown }) => ({
                req: contextOrRequest.req ?? contextOrRequest,
            });
            return;
        }

        if (isFunction(targetOptions.context)) {
            const contextFn = originalOptions.context as (
                ...args: unknown[]
            ) => unknown;
            targetOptions.context = async (...args: unknown[]) => {
                const ctx = await contextFn(...args);
                const contextOrRequest = args[0] as { req?: unknown };
                return this.assignReqProperty(
                    ctx,
                    contextOrRequest.req ?? contextOrRequest,
                );
            };
            return;
        }

        targetOptions.context = async (contextOrRequest: { req?: unknown }) =>
            this.assignReqProperty(
                originalOptions.context,
                contextOrRequest.req ?? contextOrRequest,
            );
    }

    private assignReqProperty(ctx: unknown, req: unknown): unknown {
        if (!ctx) {
            return { req };
        }
        if (
            typeof ctx !== 'object' ||
            (ctx &&
                'req' in ctx &&
                (ctx as { req?: unknown }).req &&
                typeof (ctx as { req?: unknown }).req === 'object')
        ) {
            return ctx;
        }
        (ctx as { req: unknown }).req = req;
        return ctx;
    }
}
