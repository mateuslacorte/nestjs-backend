import 'reflect-metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { UserModel } from '../models/users.model';
import { UsersResolver } from './users.resolver';

describe('UsersResolver GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load([UsersResolver, UserModel]);
    TypeMetadataStorage.compile();
  });

  it('invokes Query return typeFns', () => {
    const queries = TypeMetadataStorage.getQueriesMetadata().filter(
      (query) => query.target === UsersResolver.prototype,
    );
    const byClass = TypeMetadataStorage.getQueriesMetadata().filter(
      (query) =>
        query.target === UsersResolver ||
        query.target === UsersResolver.prototype,
    );
    expect(byClass.length).toBeGreaterThan(0);
    for (const query of byClass) {
      expect(query.typeFn()).toBeTruthy();
    }
    expect(queries.length >= 0).toBe(true);
  });

  it('invokes Mutation return typeFns', () => {
    const mutations = TypeMetadataStorage.getMutationsMetadata().filter(
      (mutation) =>
        mutation.target === UsersResolver ||
        mutation.target === UsersResolver.prototype,
    );
    expect(mutations.length).toBeGreaterThan(0);
    for (const mutation of mutations) {
      expect(mutation.typeFn()).toBe(UserModel);
    }
  });
});
