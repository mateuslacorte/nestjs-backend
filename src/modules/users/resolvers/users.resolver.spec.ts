import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { UsersResolver } from './users.resolver';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { IUser } from '../interfaces/user.interface';

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

describe('UsersResolver', () => {
  let usersService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let resolver: UsersResolver;

  beforeEach(() => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    resolver = new UsersResolver(usersService as unknown as UsersService);
  });

  describe('guards and roles', () => {
    const reflector = new Reflector();

    it('applies JwtAuthGuard and RolesGuard at class level', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        UsersResolver,
      ) as unknown[];

      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    });

    it.each([
      'users',
      'user',
      'userByEmail',
      'createUser',
      'updateUser',
      'removeUser',
    ] as const)('%s requires SUPER role', (method) => {
      expect(reflector.get(ROLES_KEY, UsersResolver.prototype[method])).toEqual(
        [Role.SUPER],
      );
    });
  });

  describe('users', () => {
    it('returns all users from the service', async () => {
      const users = [createUser()];
      usersService.findAll.mockResolvedValue(users);

      await expect(resolver.users()).resolves.toBe(users);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
    });

    it('returns null when no users exist', async () => {
      usersService.findAll.mockResolvedValue(null);
      await expect(resolver.users()).resolves.toBeNull();
    });
  });

  describe('user', () => {
    it('finds a user by id', async () => {
      const user = createUser();
      usersService.findById.mockResolvedValue(user);

      await expect(resolver.user('user-1')).resolves.toBe(user);
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('userByEmail', () => {
    it('finds a user by email', async () => {
      const user = createUser();
      usersService.findByEmail.mockResolvedValue(user);

      await expect(resolver.userByEmail('jane@example.com')).resolves.toBe(
        user,
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
      );
    });
  });

  describe('createUser', () => {
    it('creates a user via the service', async () => {
      const dto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };
      const created = createUser();
      usersService.create.mockResolvedValue(created);

      await expect(resolver.createUser(dto)).resolves.toBe(created);
      expect(usersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateUser', () => {
    it('updates a user via the service', async () => {
      const dto: UpdateUserDto = { firstName: 'Janet' };
      const updated = createUser({ firstName: 'Janet' });
      usersService.update.mockResolvedValue(updated);

      await expect(resolver.updateUser('user-1', dto)).resolves.toBe(updated);
      expect(usersService.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('removeUser', () => {
    it('removes a user via the service', async () => {
      const removed = createUser();
      usersService.remove.mockResolvedValue(removed);

      await expect(resolver.removeUser('user-1')).resolves.toBe(removed);
      expect(usersService.remove).toHaveBeenCalledWith('user-1');
    });

    it('propagates service errors', async () => {
      usersService.remove.mockRejectedValue(new Error('not found'));

      await expect(resolver.removeUser('missing')).rejects.toThrow('not found');
    });
  });
});
