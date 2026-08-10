import 'reflect-metadata';
import { ID, TypeMetadataStorage } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js';
import { Role } from '@modules/auth/enums/role.enum';
import { UserModel, UsersPageModel } from './users.model';
import { USER_PROVIDER_ID_FIELDS } from '../utils/sanitize-user-response.util';

describe('UserModel GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load([UserModel, UsersPageModel]);
    TypeMetadataStorage.compile();
  });

  function field(name: string) {
    const meta = TypeMetadataStorage.getObjectTypeMetadataByTarget(UserModel);
    return meta?.properties?.find((property) => property.name === name);
  }

  it('exposes id as nullable ID', () => {
    const idField = field('id');
    expect(idField?.typeFn()).toBe(ID);
    expect(idField?.options.nullable).toBe(true);
  });

  it.each([
    'username',
    'firstName',
    'lastName',
    'email',
    'isActive',
    'createdAt',
  ] as const)('exposes %s', (name) => {
    expect(field(name)?.typeFn()).toBeTruthy();
  });

  it.each(USER_PROVIDER_ID_FIELDS)('does not expose provider field %s', (name) => {
    expect(field(name)).toBeUndefined();
  });

  it('exposes roles as Role array', () => {
    expect(field('roles')?.typeFn()).toBe(Role);
  });
});

describe('UsersPageModel GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load([UserModel, UsersPageModel]);
    TypeMetadataStorage.compile();
  });

  it('exposes items and nullable nextCursor', () => {
    const meta = TypeMetadataStorage.getObjectTypeMetadataByTarget(UsersPageModel);
    const items = meta?.properties?.find((property) => property.name === 'items');
    const nextCursor = meta?.properties?.find(
      (property) => property.name === 'nextCursor',
    );

    expect(items?.typeFn()).toBe(UserModel);
    expect(nextCursor?.typeFn()).toBe(String);
    expect(nextCursor?.options.nullable).toBe(true);
  });
});
