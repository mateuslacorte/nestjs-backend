import 'reflect-metadata';
import { ID, TypeMetadataStorage } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js';
import { Role } from '@modules/auth/enums/role.enum';
import { UserModel } from './users.model';
import { USER_PROVIDER_ID_FIELDS } from '../utils/sanitize-user-response.util';

describe('UserModel GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load([UserModel]);
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
