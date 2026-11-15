import { Role } from '@modules/auth/enums/role.enum';
import { UsersService } from './users.service';
import { UserPostgresRepository } from './repositories/postgres.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { IUser } from './interfaces/user.interface';

type MockPostgresRepo = {
  create: jest.Mock;
  search: jest.Mock;
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
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let service: UsersService;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    postgresRepo = {
      create: jest.fn(),
      search: jest.fn(),
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
      commandBus as any,
      queryBus as any,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('create', () => {
    it('dispatches CreateUserCommand and returns AsyncOperationResult', async () => {
      commandBus.execute.mockResolvedValue(createUser());
      const dto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };

      const result = await service.create(dto);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('pending');
      expect(typeof result.operationId).toBe('string');
    });
  });

  describe('createAndAwaitUser', () => {
    it('dispatches CreateUserCommand and returns IUser', async () => {
      const created = createUser();
      commandBus.execute.mockResolvedValue(created);
      const dto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };

      const result = await service.createAndAwaitUser(dto);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(created);
    });
  });

  describe('search', () => {
    it('dispatches SearchUsersQuery via queryBus', async () => {
      const page = { items: [createUser()], nextCursor: null };
      queryBus.execute.mockResolvedValue(page);

      const result = await service.search({ limit: 50 });

      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(page);
    });
  });

  describe('findById', () => {
    it('dispatches FindUserByIdQuery via queryBus', async () => {
      const user = createUser();
      queryBus.execute.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(user);
    });

    it('passes includePassword=true through the query', async () => {
      queryBus.execute.mockResolvedValue(createUser({ password: 'hash' }));
      await service.findById('user-1', true);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
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
    it('dispatches UpdateUserCommand and returns AsyncOperationResult', async () => {
      commandBus.execute.mockResolvedValue(createUser({ firstName: 'Janet' }));
      const dto: UpdateUserDto = { firstName: 'Janet' };

      const result = await service.update('user-1', dto);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('pending');
      expect(typeof result.operationId).toBe('string');
    });
  });

  describe('remove', () => {
    it('dispatches DeleteUserCommand and returns AsyncOperationResult', async () => {
      commandBus.execute.mockResolvedValue(createUser());

      const result = await service.remove('user-1');

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('pending');
      expect(typeof result.operationId).toBe('string');
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
