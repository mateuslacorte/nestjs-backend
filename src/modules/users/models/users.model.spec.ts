import 'reflect-metadata';
import { ID, TypeMetadataStorage } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js';
import { Role } from '@modules/auth/enums/role.enum';
import { UserModel } from './users.model';

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

  it.each([
    'googleId',
    'facebookId',
    'twitterId',
    'githubId',
    'figmaId',
    'linkedinId',
    'slackId',
    'atlassianId',
    'gitlabId',
    'bitbucketId',
    'discordId',
    'twitchId',
    'steamId',
    'redditId',
    'appleId',
    'spotifyId',
    'amazonId',
    'microsoftId',
    'patreonId',
    'dropboxId',
    'coinbaseId',
    'metamaskId',
    'activeDirectoryId',
  ] as const)('exposes nullable %s as String', (name) => {
    const providerField = field(name);
    expect(providerField?.typeFn()).toBe(String);
    expect(providerField?.options.nullable).toBe(true);
  });

  it('exposes roles as Role array', () => {
    expect(field('roles')?.typeFn()).toBe(Role);
  });
});
