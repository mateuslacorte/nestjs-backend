import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from '@modules/auth/enums/role.enum';
import { UserPostgresRepository } from './postgres.repository';
import { UserEntity } from '../entities/user.entity';
import { CacheService } from '@common/cache/cache.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUser } from '../interfaces/user.interface';
import { hashPassword, isPasswordHashed } from '@common/crypto/password.util';

jest.mock('@common/crypto/password.util', () => ({
  hashPassword: jest.fn(),
  isPasswordHashed: jest.fn((value: string) => value.startsWith('$argon2')),
}));

type MockRepo = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

function createEntity(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: '$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere',
    isActive: true,
    roles: [Role.USER],
    googleId: null,
    facebookId: null,
    twitterId: null,
    githubId: null,
    figmaId: null,
    linkedinId: null,
    slackId: null,
    atlassianId: null,
    gitlabId: null,
    bitbucketId: null,
    discordId: null,
    twitchId: null,
    steamId: null,
    redditId: null,
    appleId: null,
    spotifyId: null,
    amazonId: null,
    microsoftId: null,
    patreonId: null,
    dropboxId: null,
    coinbaseId: null,
    metamaskId: null,
    activeDirectoryId: null,
    ...overrides,
  } as UserEntity;
}

describe('UserPostgresRepository', () => {
  let typeOrmRepo: MockRepo;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delPattern: jest.Mock;
  };
  let repository: UserPostgresRepository;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const hashPasswordMock = hashPassword as jest.Mock;
  const isPasswordHashedMock = isPasswordHashed as jest.Mock;

  beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    typeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };
    hashPasswordMock.mockResolvedValue('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    isPasswordHashedMock.mockImplementation((value: string) => value.startsWith('$argon2'));

    repository = new UserPostgresRepository(
      typeOrmRepo as unknown as Repository<UserEntity>,
      cacheService as unknown as CacheService,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
      });

  describe('create', () => {
    const dto: CreateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
    };

    it('creates a hashed user, clears cache, and omits password by default', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.create(dto);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: dto.email }, { username: dto.username }],
      });
      expect(hashPasswordMock).toHaveBeenCalledWith('Str0ng!P@ssw0rd');
      expect(typeOrmRepo.create).toHaveBeenCalledWith({
        ...dto,
        password: '$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere',
        googleId: null,
        facebookId: null,
        twitterId: null,
        githubId: null,
        figmaId: null,
        linkedinId: null,
        slackId: null,
        atlassianId: null,
        gitlabId: null,
        bitbucketId: null,
        discordId: null,
        twitchId: null,
        steamId: null,
        redditId: null,
        appleId: null,
        spotifyId: null,
        amazonId: null,
        microsoftId: null,
        patreonId: null,
        dropboxId: null,
        coinbaseId: null,
        metamaskId: null,
        activeDirectoryId: null,
        isActive: true,
        roles: [],
      });
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('jane@example.com');
    });

    it('returns password when includePassword=true', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.create(dto, true);

      expect(result.password).toBe('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    });

    it('omits password when includePassword is explicitly false', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.create(dto, false);

      expect(result).not.toHaveProperty('password');
    });

    it('creates successfully when all provider ids are unique', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const providerDto: CreateUserDto = {
        ...dto,
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
        appleId: 'apple-sub-001',
        spotifyId: 'spotify-001',
        amazonId: 'amzn1.account.abc123',
        microsoftId: 'ms-object-id-001',
        patreonId: 'patreon-user-001',
        dropboxId: 'dbid:abc123',
        coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
        metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        activeDirectoryId: 'ad-guid-001',
      };
      const entity = createEntity({
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
        appleId: 'apple-sub-001',
        spotifyId: 'spotify-001',
        amazonId: 'amzn1.account.abc123',
        microsoftId: 'ms-object-id-001',
        patreonId: 'patreon-user-001',
        dropboxId: 'dbid:abc123',
        coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
        metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        activeDirectoryId: 'ad-guid-001',
      });
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await expect(repository.create(providerDto)).resolves.toMatchObject({
        email: 'jane@example.com',
        googleId: 'g-1',
        facebookId: 'fb-1',
        activeDirectoryId: 'ad-guid-001',
      });
      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
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
          appleId: 'apple-sub-001',
          spotifyId: 'spotify-001',
          amazonId: 'amzn1.account.abc123',
          microsoftId: 'ms-object-id-001',
          patreonId: 'patreon-user-001',
          dropboxId: 'dbid:abc123',
          coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
          metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          activeDirectoryId: 'ad-guid-001',
        }),
      );
    });

    it('stores null password for OAuth-only users', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const oauthDto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        googleId: 'g-1',
      };
      const entity = createEntity({ password: null, googleId: 'g-1' });
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.create(oauthDto);

      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
          googleId: 'g-1',
          facebookId: null,
          twitterId: null,
          githubId: null,
          figmaId: null,
          linkedinId: null,
          slackId: null,
          atlassianId: null,
          gitlabId: null,
          bitbucketId: null,
          discordId: null,
          twitchId: null,
          steamId: null,
          redditId: null,
          appleId: null,
          spotifyId: null,
        amazonId: null,
        microsoftId: null,
        }),
      );
    });

    it('uses provided isActive and roles', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity({ isActive: false, roles: [Role.ADMIN] });
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.create({
        ...dto,
        isActive: false,
        roles: [Role.ADMIN],
      });

      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          roles: [Role.ADMIN],
        }),
      );
    });

    it('throws ConflictException when email or username exists', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      await expect(repository.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(repository.create(dto)).rejects.toThrow(
        'User with this email or username already exists',
      );
      expect(typeOrmRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when googleId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ googleId: 'g-1' }));

      await expect(
        repository.create({ ...dto, googleId: 'g-1' }),
      ).rejects.toThrow('User with this Google account already exists');
    });

    it('throws ConflictException when facebookId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ facebookId: 'fb-1' }));

      await expect(
        repository.create({ ...dto, facebookId: 'fb-1' }),
      ).rejects.toThrow('User with this Facebook account already exists');
    });

    it('throws ConflictException when twitterId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ twitterId: 'tw-1' }));

      await expect(
        repository.create({ ...dto, twitterId: 'tw-1' }),
      ).rejects.toThrow('User with this Twitter account already exists');
    });

    it('throws ConflictException when githubId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ githubId: 'gh-1' }));

      await expect(
        repository.create({ ...dto, githubId: 'gh-1' }),
      ).rejects.toThrow('User with this GitHub account already exists');
    });

    it('throws ConflictException when figmaId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ figmaId: 'fig-1' }));

      await expect(
        repository.create({ ...dto, figmaId: 'fig-1' }),
      ).rejects.toThrow('User with this Figma account already exists');
    });

    it('throws ConflictException when linkedinId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ linkedinId: 'li-1' }));

      await expect(
        repository.create({ ...dto, linkedinId: 'li-1' }),
      ).rejects.toThrow('User with this LinkedIn account already exists');
    });

    it('throws ConflictException when slackId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ slackId: 'U0R7JM' }));

      await expect(
        repository.create({ ...dto, slackId: 'U0R7JM' }),
      ).rejects.toThrow('User with this Slack account already exists');
    });

    it('throws ConflictException when atlassianId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ atlassianId: '712020:abc123' }));

      await expect(
        repository.create({ ...dto, atlassianId: '712020:abc123' }),
      ).rejects.toThrow('User with this Atlassian account already exists');
    });

    it('throws ConflictException when gitlabId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ gitlabId: '12345678' }));

      await expect(
        repository.create({ ...dto, gitlabId: '12345678' }),
      ).rejects.toThrow('User with this GitLab account already exists');
    });

    it('throws ConflictException when bitbucketId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          createEntity({
            bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
          }),
        );

      await expect(
        repository.create({
          ...dto,
          bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        }),
      ).rejects.toThrow('User with this Bitbucket account already exists');
    });

    it('throws ConflictException when discordId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ discordId: '123456789012345678' }));

      await expect(
        repository.create({ ...dto, discordId: '123456789012345678' }),
      ).rejects.toThrow('User with this Discord account already exists');
    });

    it('throws ConflictException when twitchId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ twitchId: '141981764' }));

      await expect(
        repository.create({ ...dto, twitchId: '141981764' }),
      ).rejects.toThrow('User with this Twitch account already exists');
    });

    it('throws ConflictException when steamId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ steamId: '76561198000000000' }));

      await expect(
        repository.create({ ...dto, steamId: '76561198000000000' }),
      ).rejects.toThrow('User with this Steam account already exists');
    });

    it('throws ConflictException when redditId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ redditId: 'abc123' }));

      await expect(
        repository.create({ ...dto, redditId: 'abc123' }),
      ).rejects.toThrow('User with this Reddit account already exists');
    });

    it('throws ConflictException when appleId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ appleId: 'apple-sub-001' }));

      await expect(
        repository.create({ ...dto, appleId: 'apple-sub-001' }),
      ).rejects.toThrow('User with this Apple account already exists');
    });

    it('throws ConflictException when spotifyId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ spotifyId: 'spotify-001' }));

      await expect(
        repository.create({ ...dto, spotifyId: 'spotify-001' }),
      ).rejects.toThrow('User with this Spotify account already exists');
    });

    it('throws ConflictException when amazonId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ amazonId: 'amzn1.account.abc123' }));

      await expect(
        repository.create({ ...dto, amazonId: 'amzn1.account.abc123' }),
      ).rejects.toThrow('User with this Amazon account already exists');
    });

    it('throws ConflictException when microsoftId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ microsoftId: 'ms-object-id-001' }));

      await expect(
        repository.create({ ...dto, microsoftId: 'ms-object-id-001' }),
      ).rejects.toThrow('User with this Microsoft account already exists');
    });

    it('throws ConflictException when patreonId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ patreonId: 'patreon-user-001' }));

      await expect(
        repository.create({ ...dto, patreonId: 'patreon-user-001' }),
      ).rejects.toThrow('User with this Patreon account already exists');
    });

    it('throws ConflictException when dropboxId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ dropboxId: 'dbid:abc123' }));

      await expect(
        repository.create({ ...dto, dropboxId: 'dbid:abc123' }),
      ).rejects.toThrow('User with this Dropbox account already exists');
    });

    it('throws ConflictException when coinbaseId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8' }));

      await expect(
        repository.create({ ...dto, coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8' }),
      ).rejects.toThrow('User with this Coinbase account already exists');
    });

    it('throws ConflictException when metamaskId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          createEntity({
            metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          }),
        );

      await expect(
        repository.create({
          ...dto,
          metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        }),
      ).rejects.toThrow('User with this MetaMask account already exists');
    });

    it('throws ConflictException when activeDirectoryId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ activeDirectoryId: 'ad-guid-001' }));

      await expect(
        repository.create({ ...dto, activeDirectoryId: 'ad-guid-001' }),
      ).rejects.toThrow('User with this Active Directory account already exists');
    });

    it('works without CacheService', async () => {
      repository = new UserPostgresRepository(
        typeOrmRepo as unknown as Repository<UserEntity>,
      );
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await expect(repository.create(dto)).resolves.toMatchObject({
        email: 'jane@example.com',
      });
    });

    it('update/remove/upsert work without CacheService', async () => {
      repository = new UserPostgresRepository(
        typeOrmRepo as unknown as Repository<UserEntity>,
      );
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockImplementation(async (user) => user);
      typeOrmRepo.remove.mockResolvedValue(entity);
      typeOrmRepo.create.mockReturnValue(entity);

      await expect(
        repository.update('user-1', { firstName: 'Janet' }),
      ).resolves.toMatchObject({ firstName: 'Janet' });
      await expect(repository.remove('user-1')).resolves.toMatchObject({
        id: 'user-1',
      });

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.upsert({
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          password: null,
          isActive: true,
          roles: [Role.USER],
        }),
      ).resolves.toMatchObject({ id: 'user-1' });
    });
  });

  describe('findAll', () => {
    it('returns users without passwords', async () => {
      typeOrmRepo.find.mockResolvedValue([
        createEntity(),
        createEntity({ id: 'user-2', email: 'other@example.com' }),
      ]);

      const result = await repository.findAll();

      expect(typeOrmRepo.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result![0]).not.toHaveProperty('password');
    });

    it('returns empty array when no users exist', async () => {
      typeOrmRepo.find.mockResolvedValue([]);
      await expect(repository.findAll()).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns null when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findById('missing')).resolves.toBeNull();
    });

    it('omits password by default', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      const result = await repository.findById('user-1');

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('includes password when requested', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      const result = await repository.findById('user-1', true);

      expect(result?.password).toBe('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    });

    it('omits password when includePassword is explicitly false', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      await expect(
        repository.findById('user-1', false),
      ).resolves.not.toHaveProperty('password');
    });

    it('returns cached value on cache hit', async () => {
      const cached = { id: 'user-1', email: 'cached@example.com' };
      cacheService.get.mockResolvedValueOnce(cached);

      await expect(repository.findById('user-1')).resolves.toEqual(cached);
      expect(typeOrmRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('returns null when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByEmail('x@y.com')).resolves.toBeNull();
    });

    it('omits password by default and includes when requested', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      await expect(
        repository.findByEmail('jane@example.com'),
      ).resolves.not.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(createEntity());
      await expect(
        repository.findByEmail('jane@example.com', true),
      ).resolves.toHaveProperty(
        'password',
        '$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere',
      );

      typeOrmRepo.findOne.mockResolvedValue(createEntity());
      await expect(
        repository.findByEmail('jane@example.com', false),
      ).resolves.not.toHaveProperty('password');
    });
  });

  describe('findByUsername', () => {
    it('returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());
      await expect(repository.findByUsername('janesmith')).resolves.toEqual(
        expect.objectContaining({ username: 'janesmith' }),
      );

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByUsername('missing')).resolves.toBeNull();
    });
  });

  describe('findByGoogleId / findByFacebookId / findByTwitterId / findByGithubId / findByFigmaId / findByLinkedinId / findBySlackId / findByAtlassianId / findByGitlabId / findByBitbucketId / findByDiscordId / findByTwitchId / findBySteamId / findByRedditId / findBySpotifyId / findByAmazonId / findByMicrosoftId / findByActiveDirectoryId / findByAppleId', () => {
    it('finds by googleId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity({ googleId: 'g-1' }));

      await expect(repository.findByGoogleId('g-1')).resolves.not.toHaveProperty(
        'password',
      );
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { googleId: 'g-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(createEntity({ googleId: 'g-1' }));
      await expect(
        repository.findByGoogleId('g-1', true),
      ).resolves.toHaveProperty('password');
    });

    it('returns null when googleId is missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByGoogleId('g-x')).resolves.toBeNull();
    });

    it('finds by facebookId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ facebookId: 'fb-1' }),
      );

      await expect(
        repository.findByFacebookId('fb-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { facebookId: 'fb-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ facebookId: 'fb-1' }),
      );
      await expect(
        repository.findByFacebookId('fb-1', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ facebookId: 'fb-1' }),
      );
      await expect(
        repository.findByFacebookId('fb-1', false),
      ).resolves.not.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByFacebookId('fb-x')).resolves.toBeNull();
    });

    it('finds by twitterId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ twitterId: 'tw-1' }),
      );

      await expect(
        repository.findByTwitterId('tw-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { twitterId: 'tw-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ twitterId: 'tw-1' }),
      );
      await expect(
        repository.findByTwitterId('tw-1', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByTwitterId('tw-x')).resolves.toBeNull();
    });

    it('finds by githubId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ githubId: 'gh-1' }),
      );

      await expect(
        repository.findByGithubId('gh-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { githubId: 'gh-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ githubId: 'gh-1' }),
      );
      await expect(
        repository.findByGithubId('gh-1', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByGithubId('gh-x')).resolves.toBeNull();
    });

    it('finds by figmaId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ figmaId: 'fig-1' }),
      );

      await expect(
        repository.findByFigmaId('fig-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { figmaId: 'fig-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ figmaId: 'fig-1' }),
      );
      await expect(
        repository.findByFigmaId('fig-1', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByFigmaId('fig-x')).resolves.toBeNull();
    });

    it('finds by linkedinId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ linkedinId: 'li-1' }),
      );

      await expect(
        repository.findByLinkedinId('li-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { linkedinId: 'li-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ linkedinId: 'li-1' }),
      );
      await expect(
        repository.findByLinkedinId('li-1', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByLinkedinId('li-x')).resolves.toBeNull();
    });

    it('finds by slackId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ slackId: 'U0R7JM' }),
      );

      await expect(
        repository.findBySlackId('U0R7JM'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { slackId: 'U0R7JM' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ slackId: 'U0R7JM' }),
      );
      await expect(
        repository.findBySlackId('U0R7JM', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findBySlackId('U-missing')).resolves.toBeNull();
    });

    it('finds by atlassianId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ atlassianId: '712020:abc123' }),
      );

      await expect(
        repository.findByAtlassianId('712020:abc123'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { atlassianId: '712020:abc123' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ atlassianId: '712020:abc123' }),
      );
      await expect(
        repository.findByAtlassianId('712020:abc123', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByAtlassianId('712020:missing'),
      ).resolves.toBeNull();
    });

    it('finds by gitlabId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ gitlabId: '12345678' }),
      );

      await expect(
        repository.findByGitlabId('12345678'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { gitlabId: '12345678' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ gitlabId: '12345678' }),
      );
      await expect(
        repository.findByGitlabId('12345678', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByGitlabId('12345678-missing'),
      ).resolves.toBeNull();
    });

    it('finds by bitbucketId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({
          bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        }),
      );

      await expect(
        repository.findByBitbucketId('{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({
          bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        }),
      );
      await expect(
        repository.findByBitbucketId(
          '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
          true,
        ),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByBitbucketId('{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-missing}'),
      ).resolves.toBeNull();
    });

    it('finds by discordId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ discordId: '123456789012345678' }),
      );

      await expect(
        repository.findByDiscordId('123456789012345678'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { discordId: '123456789012345678' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ discordId: '123456789012345678' }),
      );
      await expect(
        repository.findByDiscordId('123456789012345678', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByDiscordId('123456789012345678-missing'),
      ).resolves.toBeNull();
    });

    it('finds by twitchId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ twitchId: '141981764' }),
      );

      await expect(
        repository.findByTwitchId('141981764'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { twitchId: '141981764' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ twitchId: '141981764' }),
      );
      await expect(
        repository.findByTwitchId('141981764', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByTwitchId('141981764-missing'),
      ).resolves.toBeNull();
    });

    it('finds by steamId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ steamId: '76561198000000000' }),
      );

      await expect(
        repository.findBySteamId('76561198000000000'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { steamId: '76561198000000000' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ steamId: '76561198000000000' }),
      );
      await expect(
        repository.findBySteamId('76561198000000000', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findBySteamId('76561198000000000-missing'),
      ).resolves.toBeNull();
    });

    it('finds by redditId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ redditId: 'abc123' }),
      );

      await expect(
        repository.findByRedditId('abc123'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { redditId: 'abc123' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ redditId: 'abc123' }),
      );
      await expect(
        repository.findByRedditId('abc123', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByRedditId('abc123-missing'),
      ).resolves.toBeNull();
    });

    it('finds by spotifyId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ spotifyId: 'spotify-001' }),
      );

      await expect(
        repository.findBySpotifyId('spotify-001'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { spotifyId: 'spotify-001' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ spotifyId: 'spotify-001' }),
      );
      await expect(
        repository.findBySpotifyId('spotify-001', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findBySpotifyId('spotify-missing'),
      ).resolves.toBeNull();
    });

    it('finds by amazonId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ amazonId: 'amzn1.account.abc123' }),
      );

      await expect(
        repository.findByAmazonId('amzn1.account.abc123'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { amazonId: 'amzn1.account.abc123' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ amazonId: 'amzn1.account.abc123' }),
      );
      await expect(
        repository.findByAmazonId('amzn1.account.abc123', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByAmazonId('amzn1.account.missing'),
      ).resolves.toBeNull();
    });

    it('finds by microsoftId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ microsoftId: 'ms-object-id-001' }),
      );

      await expect(
        repository.findByMicrosoftId('ms-object-id-001'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { microsoftId: 'ms-object-id-001' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ microsoftId: 'ms-object-id-001' }),
      );
      await expect(
        repository.findByMicrosoftId('ms-object-id-001', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByMicrosoftId('ms-object-id-missing'),
      ).resolves.toBeNull();
    });

    it('finds by patreonId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ patreonId: 'patreon-user-001' }),
      );

      await expect(
        repository.findByPatreonId('patreon-user-001'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { patreonId: 'patreon-user-001' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ patreonId: 'patreon-user-001' }),
      );
      await expect(
        repository.findByPatreonId('patreon-user-001', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByPatreonId('patreon-user-missing'),
      ).resolves.toBeNull();
    });

    it('finds by dropboxId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ dropboxId: 'dbid:abc123' }),
      );

      await expect(
        repository.findByDropboxId('dbid:abc123'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { dropboxId: 'dbid:abc123' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ dropboxId: 'dbid:abc123' }),
      );
      await expect(
        repository.findByDropboxId('dbid:abc123', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByDropboxId('dbid:missing'),
      ).resolves.toBeNull();
    });

    it('finds by coinbaseId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8' }),
      );

      await expect(
        repository.findByCoinbaseId('9da7a204-544e-5fd1-9a12-61176c5d4cd8'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8' }),
      );
      await expect(
        repository.findByCoinbaseId('9da7a204-544e-5fd1-9a12-61176c5d4cd8', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByCoinbaseId('9da7a204-544e-5fd1-9a12-61176c5d4cd8-missing'),
      ).resolves.toBeNull();
    });

    it('finds by metamaskId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({
          metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        }),
      );

      await expect(
        repository.findByMetamaskId(
          '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        ),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({
          metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        }),
      );
      await expect(
        repository.findByMetamaskId(
          '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          true,
        ),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByMetamaskId('0xmissing'),
      ).resolves.toBeNull();
    });

    it('finds by activeDirectoryId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ activeDirectoryId: 'ad-guid-001' }),
      );

      await expect(
        repository.findByActiveDirectoryId('ad-guid-001'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { activeDirectoryId: 'ad-guid-001' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ activeDirectoryId: 'ad-guid-001' }),
      );
      await expect(
        repository.findByActiveDirectoryId('ad-guid-001', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByActiveDirectoryId('ad-guid-missing'),
      ).resolves.toBeNull();
    });

    it('finds by appleId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ appleId: 'apple-sub-001' }),
      );

      await expect(
        repository.findByAppleId('apple-sub-001'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { appleId: 'apple-sub-001' },
      });

      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ appleId: 'apple-sub-001' }),
      );
      await expect(
        repository.findByAppleId('apple-sub-001', true),
      ).resolves.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByAppleId('apple-sub-missing'),
      ).resolves.toBeNull();
    });
  });

  describe('token lookups', () => {
    it('findByEmailVerificationToken returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ emailVerificationToken: 'tok' }),
      );
      await expect(
        repository.findByEmailVerificationToken('tok'),
      ).resolves.toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { emailVerificationToken: 'tok' },
      });

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByEmailVerificationToken('missing'),
      ).resolves.toBeNull();
    });

    it('findByPasswordToken returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ passwordResetToken: 'reset' }),
      );
      await expect(repository.findByPasswordToken('reset')).resolves.toEqual(
        expect.objectContaining({ id: 'user-1' }),
      );

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByPasswordToken('x')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when user is missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hashes plain password and omits it from the result', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const result = await repository.update('user-1', {
        password: 'Str0ng!P@ssw0rd',
      });

      expect(hashPasswordMock).toHaveBeenCalledWith('Str0ng!P@ssw0rd');
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });

    it('does not re-hash already hashed passwords', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockImplementation(async (user) => user);
      const hashed = '$argon2id$v=19$m=19456,t=2,p=1$alreadyhashedvaluehere';

      await repository.update('user-1', { password: hashed });

      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(entity.password).toBe(hashed);
    });

    it('throws ConflictException when username/email already in use', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(createEntity())
        .mockResolvedValueOnce(createEntity({ id: 'other' }));

      await expect(
        repository.update('user-1', { username: 'taken' }),
      ).rejects.toThrow('Username or email already in use');
    });

    it('checks both username and email conflicts', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.update('user-1', {
        username: 'newname',
        email: 'new@example.com',
      });

      expect(typeOrmRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: expect.arrayContaining([
          expect.objectContaining({ username: 'newname' }),
          expect.objectContaining({ email: 'new@example.com' }),
        ]),
      });
    });

    it('checks email-only conflicts', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.update('user-1', { email: 'new@example.com' });

      expect(typeOrmRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: [expect.objectContaining({ email: 'new@example.com' })],
      });
    });

    it('returns password when shouldOmitPassword=false', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.update(
        'user-1',
        { firstName: 'Janet' },
        false,
      );

      expect(result.password).toBe('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    });

    it('omits password when shouldOmitPassword is explicitly true', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.update(
        'user-1',
        { firstName: 'Janet' },
        true,
      );

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repository.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes user, clears cache, and returns omitted user', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.remove.mockResolvedValue(entity);

      const result = await repository.remove('user-1');

      expect(typeOrmRepo.remove).toHaveBeenCalledWith(entity);
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('user-1');
    });
  });

  describe('upsert', () => {
    it('updates existing user found by id', async () => {
      const existing = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const result = await repository.upsert({
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Janet',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      });

      expect(existing.firstName).toBe('Janet');
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });

    it('updates existing user including password when provided', async () => {
      const existing = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      await repository.upsert({
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'new-hash',
        isActive: true,
        roles: [Role.USER],
      });

      expect(existing.password).toBe('new-hash');
    });

    it('finds by email when id is missing', async () => {
      const existing = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockResolvedValue(existing);

      await repository.upsert({
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      });

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
    });

    it('does not overwrite password when upsert payload has no password', async () => {
      const existing = createEntity({ password: 'keep-me' });
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const payload = {
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: undefined as unknown as string | null,
        isActive: true,
        roles: [Role.USER],
      };
      // Simulate falsy password branch: omit password field via destructuring path
      const { password: _p, ...rest } = payload;
      await repository.upsert({ ...rest, password: null });

      // password: null is truthy check fails for null? `if (userData.password)` - null is falsy
      // so it strips password from update data - existing password should remain
      expect(existing.password).toBe('keep-me');
    });

    it('creates a new user when none exists', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const created = createEntity({ id: 'new-1' });
      typeOrmRepo.create.mockReturnValue(created);
      typeOrmRepo.save.mockResolvedValue(created);

      const userData: IUser = {
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      };

      const result = await repository.upsert(userData);

      expect(typeOrmRepo.create).toHaveBeenCalledWith({
        ...userData,
        password: null,
      });
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });

    it('defaults password to null when upsert create payload omits password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const created = createEntity({ id: 'new-2', password: null });
      typeOrmRepo.create.mockReturnValue(created);
      typeOrmRepo.save.mockResolvedValue(created);

      await repository.upsert({
        username: 'nopw',
        firstName: 'No',
        lastName: 'Pw',
        email: 'nopw@example.com',
        isActive: true,
        roles: [Role.USER],
      } as IUser);

      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: null }),
      );
    });
  });
});
