import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@modules/auth/enums/role.enum';
import { UpdateUserDto } from './update-user.dto';

const VALID_PASSWORD = 'Str0ng!P@ssw0rd';

describe('UpdateUserDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(UpdateUserDto, plain);
    return validate(dto);
  }

  function messages(
    errors: Awaited<ReturnType<typeof validate>>,
    property: string,
  ): string[] {
    return Object.values(
      errors.find((e) => e.property === property)?.constraints ?? {},
    );
  }

  it('accepts an empty partial update', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  it('accepts a full valid partial payload', async () => {
    const errors = await validateDto({
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: VALID_PASSWORD,
      isActive: false,
      roles: [Role.USER, Role.ADMIN],
      googleId: 'g-1',
      facebookId: 'fb-1',
      twitterId: 'tw-1',
      githubId: 'gh-1',
      figmaId: 'fig-1',
      linkedinId: 'li-1',
      slackId: 'U0R7JM',
      atlassianId: '712020:abc123',
      gitlabId: '12345678',
      bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      discordId: '123456789012345678',
      twitchId: '141981764',
      steamId: '76561198000000000',
      redditId: 'abc123',
      amazonId: 'amzn1.account.abc123',
      microsoftId: 'ms-object-id-001',
      patreonId: 'patreon-user-001',
      dropboxId: 'dbid:abc123',
      coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
      metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      activeDirectoryId: 'ad-guid-001',
      emailVerificationToken: 'tok',
      emailVerificationExpires: new Date('2026-12-31T23:59:59.000Z'),
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const errors = await validateDto({ email: 'bad' });
    expect(messages(errors, 'email')).toEqual(
      expect.arrayContaining(['Invalid email address']),
    );
  });

  it('rejects weak password', async () => {
    const errors = await validateDto({ password: 'password' });
    expect(messages(errors, 'password')).toEqual(
      expect.arrayContaining(['Invalid password format']),
    );
  });

  it('rejects non-string firstName', async () => {
    const errors = await validateDto({ firstName: 1 });
    expect(messages(errors, 'firstName')).toEqual(
      expect.arrayContaining(['First name must be a string']),
    );
  });

  it('rejects non-string lastName', async () => {
    const errors = await validateDto({ lastName: true });
    expect(messages(errors, 'lastName')).toEqual(
      expect.arrayContaining(['Last name must be a string']),
    );
  });

  it('rejects non-string username', async () => {
    const errors = await validateDto({ username: {} });
    expect(messages(errors, 'username')).toEqual(
      expect.arrayContaining(['Username must be a string']),
    );
  });

  it('rejects non-boolean isActive', async () => {
    const errors = await validateDto({ isActive: 'true' });
    expect(errors.some((e) => e.property === 'isActive')).toBe(true);
  });

  it('rejects invalid roles', async () => {
    const errors = await validateDto({ roles: ['nope'] });
    expect(messages(errors, 'roles')).toEqual(
      expect.arrayContaining([
        'Each role must be a valid Role enum value',
      ]),
    );
  });

  it('rejects non-string emailVerificationToken', async () => {
    const errors = await validateDto({ emailVerificationToken: 123 });
    expect(messages(errors, 'emailVerificationToken')).toEqual(
      expect.arrayContaining([
        'E-mail verification token must be a string',
      ]),
    );
  });

  it('rejects non-Date emailVerificationExpires', async () => {
    const errors = await validateDto({
      emailVerificationExpires: '2026-12-31',
    });
    expect(messages(errors, 'emailVerificationExpires')).toEqual(
      expect.arrayContaining([
        'E-mail verification expiration must be a date',
      ]),
    );
  });

  it('rejects non-string googleId', async () => {
    const errors = await validateDto({ googleId: 99 });
    expect(errors.some((e) => e.property === 'googleId')).toBe(true);
  });

  it('rejects non-string facebookId', async () => {
    const errors = await validateDto({ facebookId: false });
    expect(errors.some((e) => e.property === 'facebookId')).toBe(true);
  });

  it('rejects non-string twitterId', async () => {
    const errors = await validateDto({ twitterId: false });
    expect(errors.some((e) => e.property === 'twitterId')).toBe(true);
  });

  it('rejects non-string githubId', async () => {
    const errors = await validateDto({ githubId: false });
    expect(errors.some((e) => e.property === 'githubId')).toBe(true);
  });

  it('rejects non-string figmaId', async () => {
    const errors = await validateDto({ figmaId: false });
    expect(errors.some((e) => e.property === 'figmaId')).toBe(true);
  });

  it('rejects non-string linkedinId', async () => {
    const errors = await validateDto({ linkedinId: false });
    expect(errors.some((e) => e.property === 'linkedinId')).toBe(true);
  });

  it('rejects non-string slackId', async () => {
    const errors = await validateDto({ slackId: false });
    expect(errors.some((e) => e.property === 'slackId')).toBe(true);
  });

  it('rejects non-string atlassianId', async () => {
    const errors = await validateDto({ atlassianId: false });
    expect(errors.some((e) => e.property === 'atlassianId')).toBe(true);
  });

  it('rejects non-string gitlabId', async () => {
    const errors = await validateDto({ gitlabId: false });
    expect(errors.some((e) => e.property === 'gitlabId')).toBe(true);
  });

  it('rejects non-string bitbucketId', async () => {
    const errors = await validateDto({ bitbucketId: false });
    expect(errors.some((e) => e.property === 'bitbucketId')).toBe(true);
  });

  it('rejects non-string discordId', async () => {
    const errors = await validateDto({ discordId: false });
    expect(errors.some((e) => e.property === 'discordId')).toBe(true);
  });

  it('rejects non-string twitchId', async () => {
    const errors = await validateDto({ twitchId: false });
    expect(errors.some((e) => e.property === 'twitchId')).toBe(true);
  });

  it('rejects non-string steamId', async () => {
    const errors = await validateDto({ steamId: false });
    expect(errors.some((e) => e.property === 'steamId')).toBe(true);
  });

  it('rejects non-string redditId', async () => {
    const errors = await validateDto({ redditId: false });
    expect(errors.some((e) => e.property === 'redditId')).toBe(true);
  });

  it('rejects non-string amazonId', async () => {
    const errors = await validateDto({ amazonId: false });
    expect(errors.some((e) => e.property === 'amazonId')).toBe(true);
  });

  it('rejects non-string microsoftId', async () => {
    const errors = await validateDto({ microsoftId: false });
    expect(errors.some((e) => e.property === 'microsoftId')).toBe(true);
  });

  it('rejects non-string patreonId', async () => {
    const errors = await validateDto({ patreonId: false });
    expect(errors.some((e) => e.property === 'patreonId')).toBe(true);
  });

  it('rejects non-string dropboxId', async () => {
    const errors = await validateDto({ dropboxId: false });
    expect(errors.some((e) => e.property === 'dropboxId')).toBe(true);
  });

  it('rejects non-string coinbaseId', async () => {
    const errors = await validateDto({ coinbaseId: false });
    expect(errors.some((e) => e.property === 'coinbaseId')).toBe(true);
  });

  it('rejects non-string metamaskId', async () => {
    const errors = await validateDto({ metamaskId: false });
    expect(errors.some((e) => e.property === 'metamaskId')).toBe(true);
  });

  it('rejects non-string activeDirectoryId', async () => {
    const errors = await validateDto({ activeDirectoryId: false });
    expect(errors.some((e) => e.property === 'activeDirectoryId')).toBe(true);
  });

  it('exposes roles as Role array via GraphQL Field typeFn', () => {
    const { TypeMetadataStorage } = require('@nestjs/graphql');
    const {
      LazyMetadataStorage,
    } = require('@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage.js');
    LazyMetadataStorage.load([UpdateUserDto]);
    TypeMetadataStorage.compile();
    const meta = TypeMetadataStorage.getInputTypeMetadataByTarget(UpdateUserDto);
    const rolesField = meta?.properties?.find(
      (property: { name: string }) => property.name === 'roles',
    );
    expect(rolesField?.typeFn()).toBe(Role);
  });
});
