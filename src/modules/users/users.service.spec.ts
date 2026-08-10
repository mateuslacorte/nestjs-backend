import { Role } from '@modules/auth/enums/role.enum';
import { UsersService } from './users.service';
import { UserPostgresRepository } from './repositories/postgres.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { IUser } from './interfaces/user.interface';
import {
  ENABLE_CACHE,
  NO_CACHE,
} from '@common/cache/decorators/cache.decorator';

type MockPostgresRepo = {
  create: jest.Mock;
  findAll: jest.Mock;
  findById: jest.Mock;
  findByEmail: jest.Mock;
  findByUsername: jest.Mock;
  findByGoogleId: jest.Mock;
  findByFacebookId: jest.Mock;
  findByTwitterId: jest.Mock;
  findByGithubId: jest.Mock;
  findByFigmaId: jest.Mock;
  findByLinkedinId: jest.Mock;
  findBySlackId: jest.Mock;
  findByAtlassianId: jest.Mock;
  findByGitlabId: jest.Mock;
  findByBitbucketId: jest.Mock;
  findByDiscordId: jest.Mock;
  findByTwitchId: jest.Mock;
  findBySteamId: jest.Mock;
  findByRedditId: jest.Mock;
  findByAmazonId: jest.Mock;
  findByPatreonId: jest.Mock;
  findByDropboxId: jest.Mock;
  findByMetamaskId: jest.Mock;
  findByActiveDirectoryId: jest.Mock;
  findByAppleId: jest.Mock;
  findByEmailVerificationToken: jest.Mock;
  findByPasswordToken: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

function createUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: 'user-1',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: null,
    isActive: true,
    roles: [Role.USER],
    ...overrides,
  };
}

describe('UsersService', () => {
  let postgresRepo: MockPostgresRepo;
  let service: UsersService;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    postgresRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      findByFacebookId: jest.fn(),
      findByTwitterId: jest.fn(),
      findByGithubId: jest.fn(),
      findByFigmaId: jest.fn(),
      findByLinkedinId: jest.fn(),
      findBySlackId: jest.fn(),
      findByAtlassianId: jest.fn(),
      findByGitlabId: jest.fn(),
      findByBitbucketId: jest.fn(),
      findByDiscordId: jest.fn(),
      findByTwitchId: jest.fn(),
      findBySteamId: jest.fn(),
      findByRedditId: jest.fn(),
      findByAmazonId: jest.fn(),
      findByPatreonId: jest.fn(),
      findByDropboxId: jest.fn(),
      findByMetamaskId: jest.fn(),
      findByActiveDirectoryId: jest.fn(),
      findByAppleId: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      findByPasswordToken: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    service = new UsersService(
      postgresRepo as unknown as UserPostgresRepository,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('cache metadata', () => {
    it('enables cache on create, findAll, update, and remove', () => {
      for (const method of ['create', 'findAll', 'update', 'remove'] as const) {
        expect(
          Reflect.getMetadata(ENABLE_CACHE, UsersService.prototype, method),
        ).toBe(true);
      }
    });

    it('marks lookups with NoCache', () => {
      for (const method of [
        'findById',
        'findByEmail',
        'findByUsername',
        'findByGoogleId',
        'findByFacebookId',
        'findByTwitterId',
        'findByGithubId',
        'findByFigmaId',
        'findByLinkedinId',
        'findBySlackId',
        'findByAtlassianId',
        'findByGitlabId',
        'findByBitbucketId',
        'findByDiscordId',
        'findByTwitchId',
        'findBySteamId',
        'findByRedditId',
        'findByAmazonId',
        'findByPatreonId',
        'findByDropboxId',
        'findByMetamaskId',
        'findByActiveDirectoryId',
        'findByAppleId',
        'findByEmailVerificationToken',
        'findByPasswordToken',
      ] as const) {
        expect(
          Reflect.getMetadata(NO_CACHE, UsersService.prototype[method]),
        ).toBe(true);
      }
    });
  });

  describe('create', () => {
    it('delegates to postgres create with includePassword=true', async () => {
      const dto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };
      const created = createUser({ password: 'hash' });
      postgresRepo.create.mockResolvedValue(created);

      await expect(service.create(dto)).resolves.toBe(created);
      expect(postgresRepo.create).toHaveBeenCalledWith(dto, true);
    });
  });

  describe('findAll', () => {
    it('returns sanitized repository result', async () => {
      const users = [createUser({ googleId: 'g-1' })];
      postgresRepo.findAll.mockResolvedValue(users);

      await expect(service.findAll()).resolves.toBe(users);
    });

    it('returns null when repository returns null', async () => {
      postgresRepo.findAll.mockResolvedValue(null);
      await expect(service.findAll()).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('defaults includePassword to false', async () => {
      postgresRepo.findById.mockResolvedValue(createUser());

      await service.findById('user-1');

      expect(postgresRepo.findById).toHaveBeenCalledWith('user-1', false);
    });

    it('forwards includePassword=false explicitly', async () => {
      await service.findById('user-1', false);
      expect(postgresRepo.findById).toHaveBeenCalledWith('user-1', false);
    });

    it('forwards includePassword=true', async () => {
      postgresRepo.findById.mockResolvedValue(createUser({ password: 'hash' }));

      await service.findById('user-1', true);

      expect(postgresRepo.findById).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('findByEmail', () => {
    it('defaults includePassword to false', async () => {
      postgresRepo.findByEmail.mockResolvedValue(createUser());

      await service.findByEmail('jane@example.com');

      expect(postgresRepo.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
        false,
      );
    });

    it('forwards includePassword=false explicitly', async () => {
      await service.findByEmail('jane@example.com', false);
      expect(postgresRepo.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
        false,
      );
    });

    it('forwards includePassword=true', async () => {
      await service.findByEmail('jane@example.com', true);
      expect(postgresRepo.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
        true,
      );
    });
  });

  describe('findByUsername', () => {
    it('delegates to repository', async () => {
      const user = createUser();
      postgresRepo.findByUsername.mockResolvedValue(user);

      await expect(service.findByUsername('janesmith')).resolves.toBe(user);
      expect(postgresRepo.findByUsername).toHaveBeenCalledWith('janesmith');
    });
  });

  describe('provider findBy* includePassword branches', () => {
    const cases: Array<{
      method: keyof UsersService & string;
      repo: keyof MockPostgresRepo;
      id: string;
    }> = [
      { method: 'findByGoogleId', repo: 'findByGoogleId', id: 'g-1' },
      { method: 'findByFacebookId', repo: 'findByFacebookId', id: 'fb-1' },
      { method: 'findByTwitterId', repo: 'findByTwitterId', id: 'tw-1' },
      { method: 'findByGithubId', repo: 'findByGithubId', id: 'gh-1' },
      { method: 'findByFigmaId', repo: 'findByFigmaId', id: 'fig-1' },
      { method: 'findByLinkedinId', repo: 'findByLinkedinId', id: 'li-1' },
      { method: 'findBySlackId', repo: 'findBySlackId', id: 'U0R7JM' },
      {
        method: 'findByAtlassianId',
        repo: 'findByAtlassianId',
        id: '712020:abc123',
      },
      { method: 'findByGitlabId', repo: 'findByGitlabId', id: '12345678' },
      {
        method: 'findByBitbucketId',
        repo: 'findByBitbucketId',
        id: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      },
      {
        method: 'findByDiscordId',
        repo: 'findByDiscordId',
        id: '123456789012345678',
      },
      { method: 'findByTwitchId', repo: 'findByTwitchId', id: '141981764' },
      {
        method: 'findBySteamId',
        repo: 'findBySteamId',
        id: '76561198000000000',
      },
      { method: 'findByRedditId', repo: 'findByRedditId', id: 'abc123' },
      {
        method: 'findByAmazonId',
        repo: 'findByAmazonId',
        id: 'amzn1.account.abc123',
      },
      {
        method: 'findByPatreonId',
        repo: 'findByPatreonId',
        id: 'patreon-user-001',
      },
      { method: 'findByDropboxId', repo: 'findByDropboxId', id: 'dbid:abc123' },
      {
        method: 'findByMetamaskId',
        repo: 'findByMetamaskId',
        id: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      },
      {
        method: 'findByActiveDirectoryId',
        repo: 'findByActiveDirectoryId',
        id: 'ad-guid-001',
      },
      { method: 'findByAppleId', repo: 'findByAppleId', id: 'apple-sub-001' },
    ];

    it.each(cases)(
      '$method defaults false, accepts explicit false, and forwards true',
      async ({ method, repo, id }) => {
        const fn = service[method] as (
          providerId: string,
          includePassword?: boolean,
        ) => Promise<IUser | null>;

        await fn.call(service, id);
        expect(postgresRepo[repo]).toHaveBeenCalledWith(id, false);

        await fn.call(service, id, false);
        expect(postgresRepo[repo]).toHaveBeenCalledWith(id, false);

        await fn.call(service, id, true);
        expect(postgresRepo[repo]).toHaveBeenCalledWith(id, true);
      },
    );
  });

  describe('findByEmailVerificationToken', () => {
    it('delegates to repository', async () => {
      const user = createUser();
      postgresRepo.findByEmailVerificationToken.mockResolvedValue(user);

      await expect(
        service.findByEmailVerificationToken('tok'),
      ).resolves.toBe(user);
      expect(postgresRepo.findByEmailVerificationToken).toHaveBeenCalledWith(
        'tok',
      );
    });
  });

  describe('findByPasswordToken', () => {
    it('delegates to repository', async () => {
      const user = createUser();
      postgresRepo.findByPasswordToken.mockResolvedValue(user);

      await expect(service.findByPasswordToken('reset')).resolves.toBe(user);
      expect(postgresRepo.findByPasswordToken).toHaveBeenCalledWith('reset');
    });
  });

  describe('update', () => {
    it('delegates to repository', async () => {
      const dto: UpdateUserDto = { firstName: 'Janet' };
      const updated = createUser({ firstName: 'Janet' });
      postgresRepo.update.mockResolvedValue(updated);

      await expect(service.update('user-1', dto)).resolves.toBe(updated);
      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates to repository', async () => {
      const removed = createUser();
      postgresRepo.remove.mockResolvedValue(removed);

      await expect(service.remove('user-1')).resolves.toBe(removed);
      expect(postgresRepo.remove).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateResetToken', () => {
    it('updates reset token fields via repository', async () => {
      const resetData = {
        passwordResetToken: 'tok',
        passwordResetExpires: new Date('2026-01-01'),
      };
      postgresRepo.update.mockResolvedValue(createUser());

      await service.updateResetToken('user-1', resetData);

      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', resetData);
    });
  });

  describe('updatePassword', () => {
    it('updates password with shouldOmitPassword=false', async () => {
      const passwordData = {
        password: 'hashed',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      };
      postgresRepo.update.mockResolvedValue(createUser());

      await service.updatePassword('user-1', passwordData);

      expect(postgresRepo.update).toHaveBeenCalledWith(
        'user-1',
        passwordData,
        false,
      );
    });
  });

  describe('updateRoles', () => {
    it('updates roles via repository', async () => {
      const updated = createUser({ roles: [Role.ADMIN] });
      postgresRepo.update.mockResolvedValue(updated);

      await expect(
        service.updateRoles('user-1', [Role.ADMIN]),
      ).resolves.toBe(updated);
      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.ADMIN],
      });
    });
  });

  describe('addRole', () => {
    it('throws when user is missing', async () => {
      postgresRepo.findById.mockResolvedValue(null);

      await expect(service.addRole('missing', Role.ADMIN)).rejects.toThrow(
        'User with ID missing not found',
      );
    });

    it('adds role when not already present', async () => {
      postgresRepo.findById.mockResolvedValue(createUser({ roles: [Role.USER] }));
      const updated = createUser({ roles: [Role.USER, Role.ADMIN] });
      postgresRepo.update.mockResolvedValue(updated);

      await expect(service.addRole('user-1', Role.ADMIN)).resolves.toBe(
        updated,
      );
      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.USER, Role.ADMIN],
      });
    });

    it('returns user unchanged when role already present', async () => {
      const user = createUser({ roles: [Role.USER, Role.ADMIN] });
      postgresRepo.findById.mockResolvedValue(user);

      await expect(service.addRole('user-1', Role.ADMIN)).resolves.toBe(user);
      expect(postgresRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('removeRole', () => {
    it('throws when user is missing', async () => {
      postgresRepo.findById.mockResolvedValue(null);

      await expect(service.removeRole('missing', Role.USER)).rejects.toThrow(
        'User with ID missing not found',
      );
    });

    it('removes the role and updates', async () => {
      postgresRepo.findById.mockResolvedValue(
        createUser({ roles: [Role.USER, Role.ADMIN] }),
      );
      const updated = createUser({ roles: [Role.ADMIN] });
      postgresRepo.update.mockResolvedValue(updated);

      await expect(service.removeRole('user-1', Role.USER)).resolves.toBe(
        updated,
      );
      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.ADMIN],
      });
    });

    it('updates even when role was not present (no-op filter)', async () => {
      postgresRepo.findById.mockResolvedValue(createUser({ roles: [Role.USER] }));
      const updated = createUser({ roles: [Role.USER] });
      postgresRepo.update.mockResolvedValue(updated);

      await service.removeRole('user-1', Role.ADMIN);

      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.USER],
      });
    });
  });

  describe('replaceRole', () => {
    it('throws when user is missing', async () => {
      postgresRepo.findById.mockResolvedValue(null);

      await expect(
        service.replaceRole('missing', Role.USER, Role.ADMIN),
      ).rejects.toThrow('User with ID missing not found');
    });

    it('replaces old role with new role', async () => {
      postgresRepo.findById.mockResolvedValue(createUser({ roles: [Role.USER] }));
      const updated = createUser({ roles: [Role.ADMIN] });
      postgresRepo.update.mockResolvedValue(updated);

      await expect(
        service.replaceRole('user-1', Role.USER, Role.ADMIN),
      ).resolves.toBe(updated);
      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.ADMIN],
      });
    });

    it('deduplicates roles after replacement', async () => {
      postgresRepo.findById.mockResolvedValue(
        createUser({ roles: [Role.USER, Role.ADMIN] }),
      );
      const updated = createUser({ roles: [Role.ADMIN] });
      postgresRepo.update.mockResolvedValue(updated);

      await service.replaceRole('user-1', Role.USER, Role.ADMIN);

      expect(postgresRepo.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.ADMIN],
      });
    });
  });
});
