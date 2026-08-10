import 'reflect-metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js';
import { Role } from '@modules/auth/enums/role.enum';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load([CreateUserDto]);
    TypeMetadataStorage.compile();
  });

  function field(name: string) {
    const meta = TypeMetadataStorage.getInputTypeMetadataByTarget(CreateUserDto);
    return meta?.properties?.find((property) => property.name === name);
  }

  it.each([
    'password',
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
    'amazonId',
    'patreonId',
    'dropboxId',
    'metamaskId',
    'activeDirectoryId',
    'appleId',
  ] as const)('exposes nullable %s as String', (name) => {
    const providerField = field(name);
    expect(providerField?.typeFn()).toBe(String);
    expect(providerField?.options.nullable).toBe(true);
  });

  it('exposes roles as Role array', () => {
    expect(field('roles')?.typeFn()).toBe(Role);
  });
});
