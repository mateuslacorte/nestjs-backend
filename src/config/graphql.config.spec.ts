import graphqlConfig from './graphql.config';

describe('graphql.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GRAPHQL_AUTO_SCHEMA_FILE;
    delete process.env.GRAPHQL_PLAYGROUND;
    delete process.env.GRAPHQL_INTROSPECTION;
    delete process.env.GRAPHQL_SORT_SCHEMA;
    delete process.env.GRAPHQL_PATH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(graphqlConfig()).toEqual({
      autoSchemaFile: true,
      playground: false,
      introspection: false,
      sortSchema: false,
      path: '/graphql',
    });
  });

  it('treats GRAPHQL_AUTO_SCHEMA_FILE=true as boolean true', () => {
    process.env.GRAPHQL_AUTO_SCHEMA_FILE = 'true';
    expect(graphqlConfig().autoSchemaFile).toBe(true);
  });

  it('treats GRAPHQL_AUTO_SCHEMA_FILE=false as boolean false', () => {
    process.env.GRAPHQL_AUTO_SCHEMA_FILE = 'false';
    expect(graphqlConfig().autoSchemaFile).toBe(false);
  });

  it('treats other GRAPHQL_AUTO_SCHEMA_FILE values as a path string', () => {
    process.env.GRAPHQL_AUTO_SCHEMA_FILE = 'src/schema.gql';
    expect(graphqlConfig().autoSchemaFile).toBe('src/schema.gql');
  });

  it('enables playground, introspection, and sortSchema only for true', () => {
    process.env.GRAPHQL_PLAYGROUND = 'true';
    process.env.GRAPHQL_INTROSPECTION = 'true';
    process.env.GRAPHQL_SORT_SCHEMA = 'true';
    process.env.GRAPHQL_PATH = '/api/gql';

    expect(graphqlConfig()).toEqual({
      autoSchemaFile: true,
      playground: true,
      introspection: true,
      sortSchema: true,
      path: '/api/gql',
    });
  });

  it.each(['1', 'TRUE', 'false'])(
    'keeps playground false when GRAPHQL_PLAYGROUND=%s',
    (value) => {
      process.env.GRAPHQL_PLAYGROUND = value;
      expect(graphqlConfig().playground).toBe(false);
    },
  );
});
