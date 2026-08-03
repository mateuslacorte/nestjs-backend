import {
  ApolloFastifyDriver,
  ApolloFastifyDriverConfig,
} from './index';

describe('common/graphql barrel', () => {
  it('re-exports ApolloFastifyDriver', () => {
    expect(ApolloFastifyDriver).toBeDefined();
    expect(typeof ApolloFastifyDriver).toBe('function');
  });

  it('exposes ApolloFastifyDriverConfig as a usable type', () => {
    const config: ApolloFastifyDriverConfig = {
      path: '/graphql',
      playground: false,
    };
    expect(config.path).toBe('/graphql');
    expect(config.playground).toBe(false);
  });
});
