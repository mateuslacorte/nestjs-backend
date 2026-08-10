import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { Role } from '@modules/auth/enums/role.enum';
import { UserMongoRepository } from './mongo.repository';
import { User } from '../schemas/user.schema';
import { CacheService } from '@common/cache/cache.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUser } from '../interfaces/user.interface';
import { hashPassword, isPasswordHashed } from '@common/crypto/password.util';

jest.mock('@common/crypto/password.util', () => ({
  hashPassword: jest.fn(),
  isPasswordHashed: jest.fn((value: string) => value.startsWith('$argon2')),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

type MockModel = jest.Mock & {
  findOne: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

function createDoc(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'fixed-uuid',
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
    appleId: null,
    amazonId: null,
    patreonId: null,
    dropboxId: null,
    metamaskId: null,
    ...overrides,
  };

  return {
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnValue({ ...data }),
  };
}

describe('UserMongoRepository', () => {
  let model: MockModel;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delPattern: jest.Mock;
  };
  let repository: UserMongoRepository;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const hashPasswordMock = hashPassword as jest.Mock;
  const isPasswordHashedMock = isPasswordHashed as jest.Mock;

  beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    model = Object.assign(jest.fn(), {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    }) as MockModel;

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };
    hashPasswordMock.mockResolvedValue('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    isPasswordHashedMock.mockImplementation((value: string) => value.startsWith('$argon2'));

    repository = new UserMongoRepository(
      model as unknown as Model<User>,
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

    it('creates hashed user with uuid ids, clears cache, omits password', async () => {
      model.findOne.mockResolvedValue(null);
      const doc = createDoc();
      model.mockImplementation(() => doc);

      const result = await repository.create(dto);

      expect(model.findOne).toHaveBeenCalledWith({
        $or: [{ email: dto.email }, { username: dto.username }],
      });
      expect(hashPasswordMock).toHaveBeenCalledWith('Str0ng!P@ssw0rd');
      expect(model).toHaveBeenCalledWith({
        ...dto,
        _id: 'fixed-uuid',
        id: 'fixed-uuid',
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
            appleId: null,
        amazonId: null,
            patreonId: null,
        dropboxId: null,
        metamaskId: null,
        activeDirectoryId: null,
      });
      expect(doc.save).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalledWith('mongoose:users:user:*');
      expect(result).not.toHaveProperty('password');
    });

    it('returns full object when includePassword=true', async () => {
      model.findOne.mockResolvedValue(null);
      const doc = createDoc();
      model.mockImplementation(() => doc);

      const result = await repository.create(dto, true);

      expect(result.password).toBe('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
      expect(doc.toObject).toHaveBeenCalled();
    });

    it('omits password when includePassword is explicitly false', async () => {
      model.findOne.mockResolvedValue(null);
      const doc = createDoc();
      model.mockImplementation(() => doc);

      const result = await repository.create(dto, false);

      expect(result).not.toHaveProperty('password');
    });

    it('preserves provided optional provider ids (non-null coalescing)', async () => {
      model.findOne.mockResolvedValue(null);
      const doc = createDoc({
        googleId: 'g-1',
        facebookId: 'fb-1',
        twitterId: 'tw-1',
        githubId: 'gh-1',
        figmaId: 'fig-1',
        linkedinId: 'li-1',
        slackId: 'sl-1',
        atlassianId: 'at-1',
        gitlabId: 'gl-1',
        bitbucketId: 'bb-1',
        discordId: 'dc-1',
        twitchId: 'twitch-1',
        steamId: 'steam-1',
        appleId: 'ap-1',
        amazonId: 'am-1',
        patreonId: 'pt-1',
        dropboxId: 'db-1',
        metamaskId: '0xabc',
        activeDirectoryId: 'ad-1',
      });
      model.mockImplementation(() => doc);

      await repository.create({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        googleId: 'g-1',
        facebookId: 'fb-1',
        twitterId: 'tw-1',
        githubId: 'gh-1',
        figmaId: 'fig-1',
        linkedinId: 'li-1',
        slackId: 'sl-1',
        atlassianId: 'at-1',
        gitlabId: 'gl-1',
        bitbucketId: 'bb-1',
        discordId: 'dc-1',
        twitchId: 'twitch-1',
        steamId: 'steam-1',
        appleId: 'ap-1',
        amazonId: 'am-1',
        patreonId: 'pt-1',
        dropboxId: 'db-1',
        metamaskId: '0xabc',
        activeDirectoryId: 'ad-1',
      });

      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'g-1',
          facebookId: 'fb-1',
          twitterId: 'tw-1',
          githubId: 'gh-1',
          figmaId: 'fig-1',
          linkedinId: 'li-1',
          slackId: 'sl-1',
          atlassianId: 'at-1',
          gitlabId: 'gl-1',
          bitbucketId: 'bb-1',
          discordId: 'dc-1',
          twitchId: 'twitch-1',
          steamId: 'steam-1',
            appleId: 'ap-1',
          amazonId: 'am-1',
            patreonId: 'pt-1',
          dropboxId: 'db-1',
          metamaskId: '0xabc',
          activeDirectoryId: 'ad-1',
          password: null,
        }),
      );
    });

    it('stores null password when password is omitted', async () => {
      model.findOne.mockResolvedValue(null);
      const doc = createDoc({ password: null, googleId: 'g-1' });
      model.mockImplementation(() => doc);

      await repository.create({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        googleId: 'g-1',
      });

      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(model).toHaveBeenCalledWith(
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
                appleId: null,
    amazonId: null,
        }),
      );
    });

    it('throws ConflictException when email or username exists', async () => {
      model.findOne.mockResolvedValue(createDoc());

      await expect(repository.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(repository.create(dto)).rejects.toThrow(
        'User with this email or username already exists',
      );
    });

    it('works without CacheService', async () => {
      repository = new UserMongoRepository(model as unknown as Model<User>);
      model.findOne.mockResolvedValue(null);
      const doc = createDoc();
      model.mockImplementation(() => doc);

      await expect(repository.create(dto)).resolves.toMatchObject({
        email: 'jane@example.com',
      });
    });
  });

  describe('search', () => {
    it('returns users without passwords', async () => {
      const docs = [
        createDoc({ createdAt: new Date('2026-08-10T00:00:00.000Z') }),
        createDoc({ id: '2', email: 'other@example.com' }),
      ];
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(docs),
      };
      model.find.mockReturnValue(chain);

      const result = await repository.search({
        limit: 10,
        q: 'jane',
        isActive: true,
        cursorCreatedAt: new Date('2026-08-10T00:00:00.000Z'),
        cursorId: 'prev',
      });

      expect(model.find).toHaveBeenCalled();
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1, id: -1 });
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
    });

    it('works with empty filter', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(chain);

      await expect(repository.search({ limit: 50 })).resolves.toEqual([]);
      expect(chain.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when missing', async () => {
      model.findById.mockResolvedValue(null);

      await expect(repository.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(repository.findById('missing')).rejects.toThrow(
        'User with ID missing not found',
      );
    });

    it('returns user without password', async () => {
      model.findById.mockResolvedValue(createDoc());

      const result = await repository.findById('fixed-uuid');

      expect(model.findById).toHaveBeenCalledWith('fixed-uuid');
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('fixed-uuid');
    });

    it('returns cached user on cache hit', async () => {
      const cached = { id: 'fixed-uuid', email: 'cached@example.com' };
      cacheService.get.mockResolvedValueOnce(cached);

      await expect(repository.findById('fixed-uuid')).resolves.toEqual(cached);
      expect(model.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('hashes plain password and clears cache', async () => {
      const updated = createDoc({ firstName: 'Janet' });
      model.findOne.mockResolvedValue(null);
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await repository.update('fixed-uuid', {
        firstName: 'Janet',
        password: 'Str0ng!P@ssw0rd',
      });

      expect(hashPasswordMock).toHaveBeenCalledWith('Str0ng!P@ssw0rd');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'fixed-uuid',
        expect.objectContaining({
          firstName: 'Janet',
          password: '$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere',
        }),
        { new: true },
      );
      expect(cacheService.delPattern).toHaveBeenCalledWith('mongoose:users:user:*');
      expect(result).not.toHaveProperty('password');
    });

    it('does not re-hash already hashed passwords', async () => {
      const hashed = '$argon2id$v=19$m=19456,t=2,p=1$alreadyhashedvaluehere';
      model.findOne.mockResolvedValue(null);
      model.findByIdAndUpdate.mockResolvedValue(createDoc({ password: hashed }));

      await repository.update('fixed-uuid', { password: hashed });

      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'fixed-uuid',
        expect.objectContaining({ password: hashed }),
        { new: true },
      );
    });

    it('throws ConflictException when username/email already in use', async () => {
      model.findOne.mockResolvedValue(createDoc({ id: 'other' }));

      await expect(
        repository.update('fixed-uuid', { username: 'taken' }),
      ).rejects.toThrow('Username or email already in use');

      expect(model.findOne).toHaveBeenCalledWith({
        _id: { $ne: 'fixed-uuid' },
        username: 'taken',
      });
    });

    it('includes email in conflict query when provided', async () => {
      model.findOne.mockResolvedValue(null);
      model.findByIdAndUpdate.mockResolvedValue(createDoc());

      await repository.update('fixed-uuid', {
        username: 'new',
        email: 'new@example.com',
      });

      expect(model.findOne).toHaveBeenCalledWith({
        _id: { $ne: 'fixed-uuid' },
        username: 'new',
        email: 'new@example.com',
      });
    });

    it('builds conflict query with only email when username omitted', async () => {
      model.findOne.mockResolvedValue(null);
      model.findByIdAndUpdate.mockResolvedValue(createDoc());

      await repository.update('fixed-uuid', {
        email: 'only-email@example.com',
      });

      expect(model.findOne).toHaveBeenCalledWith({
        _id: { $ne: 'fixed-uuid' },
        email: 'only-email@example.com',
      });
    });

    it('throws NotFoundException when update target is missing', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        repository.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns password when shouldOmitPassword=false', async () => {
      const updated = createDoc();
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await repository.update(
        'fixed-uuid',
        { firstName: 'Janet' },
        false,
      );

      expect(updated.toObject).toHaveBeenCalled();
      expect(result.password).toBe('$argon2id$v=19$m=19456,t=2,p=1$hashedpasswordvaluehere');
    });

    it('omits password when shouldOmitPassword is explicitly true', async () => {
      const updated = createDoc();
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await repository.update(
        'fixed-uuid',
        { firstName: 'Janet' },
        true,
      );

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      model.findByIdAndDelete.mockResolvedValue(null);

      await expect(repository.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes user, clears cache, and omits password', async () => {
      const deleted = createDoc();
      model.findByIdAndDelete.mockResolvedValue(deleted);

      const result = await repository.remove('fixed-uuid');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('fixed-uuid');
      expect(cacheService.delPattern).toHaveBeenCalledWith('mongoose:users:user:*');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('IUser shape', () => {
    it('omitPassword returns IUser-compatible object', async () => {
      model.findById.mockResolvedValue(createDoc());

      const result: IUser = await repository.findById('fixed-uuid');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'fixed-uuid',
          email: 'jane@example.com',
          roles: [Role.USER],
        }),
      );
    });
  });
});
