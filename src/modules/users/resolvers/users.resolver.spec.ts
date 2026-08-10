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
import { AUDIT_KEY } from '@common/audit/audit.constants';

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
    search: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let resolver: UsersResolver;

  beforeEach(() => {
    usersService = {
      search: jest.fn(),
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

  describe('audit metadata', () => {
    const reflector = new Reflector();

    it.each([
      ['createUser', 'user.create'],
      ['updateUser', 'user.update'],
      ['removeUser', 'user.delete'],
    ] as const)('%s is audited as %s', (method, action) => {
      expect(
        reflector.get(AUDIT_KEY, UsersResolver.prototype[method]),
      ).toEqual(expect.objectContaining({ action, category: 'user' }));
    });
  });

  describe('users', () => {
    it('returns a page from the service', async () => {
      const page = { items: [createUser()], nextCursor: null };
      usersService.search.mockResolvedValue(page);

      await expect(resolver.users(undefined, 10, 'jane', true)).resolves.toBe(
        page,
      );
      expect(usersService.search).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 10,
        q: 'jane',
        isActive: true,
      });
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
