import { registerAs } from '@nestjs/config';

export default registerAs('graphql', () => {
    const getAutoSchemaFile = () => {
        const value = process.env.GRAPHQL_AUTO_SCHEMA_FILE;
        if (!value || value === 'true') return true;
        if (value === 'false') return false;
        return value; // Return as string path
    };

    return {
        autoSchemaFile: getAutoSchemaFile(),
        playground: process.env.GRAPHQL_PLAYGROUND === 'true',
        introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
        debug: process.env.GRAPHQL_DEBUG === 'true',
        sortSchema: process.env.GRAPHQL_SORT_SCHEMA === 'true',
        path: process.env.GRAPHQL_PATH || '/graphql',
    };
});

