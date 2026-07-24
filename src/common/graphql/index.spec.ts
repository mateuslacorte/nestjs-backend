import {
  ApolloExpressDriver,
  ApolloExpressDriverConfig,
} from './index';

describe('common/graphql barrel', () => {
  it('re-exports ApolloExpressDriver', () => {
    expect(ApolloExpressDriver).toBeDefined();
    expect(typeof ApolloExpressDriver).toBe('function');
  });

  it('exposes ApolloExpressDriverConfig as a usable type', () => {
    const config: ApolloExpressDriverConfig = {
      path: '/graphql',
      playground: false,
    };
    expect(config.path).toBe('/graphql');
    expect(config.playground).toBe(false);
  });
});
