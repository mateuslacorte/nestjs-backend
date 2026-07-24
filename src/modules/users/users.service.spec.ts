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
    it('returns repository result', async () => {
      const users = [createUser()];
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

  describe('findByGoogleId', () => {
    it('defaults includePassword to false', async () => {
      await service.findByGoogleId('g-1');
      expect(postgresRepo.findByGoogleId).toHaveBeenCalledWith('g-1', false);
    });

    it('forwards includePassword=true', async () => {
      await service.findByGoogleId('g-1', true);
      expect(postgresRepo.findByGoogleId).toHaveBeenCalledWith('g-1', true);
    });
  });

  describe('findByFacebookId', () => {
    it('defaults includePassword to false', async () => {
      await service.findByFacebookId('fb-1');
      expect(postgresRepo.findByFacebookId).toHaveBeenCalledWith('fb-1', false);
    });

    it('forwards includePassword=true', async () => {
      await service.findByFacebookId('fb-1', true);
      expect(postgresRepo.findByFacebookId).toHaveBeenCalledWith('fb-1', true);
    });
  });

  describe('findByTwitterId', () => {
    it('defaults includePassword to false', async () => {
      await service.findByTwitterId('tw-1');
      expect(postgresRepo.findByTwitterId).toHaveBeenCalledWith('tw-1', false);
    });

    it('forwards includePassword=true', async () => {
      await service.findByTwitterId('tw-1', true);
      expect(postgresRepo.findByTwitterId).toHaveBeenCalledWith('tw-1', true);
    });
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
