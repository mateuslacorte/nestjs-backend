import {
  PATH_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { IUser } from './interfaces/user.interface';
import { sanitizeUserForResponse } from './utils/sanitize-user-response.util';
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

describe('UsersController', () => {
  let usersService: {
    create: jest.Mock;
    search: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      search: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new UsersController(
      usersService as unknown as UsersService,
    );
  });

  describe('routing metadata', () => {
    it('is mounted at /users', () => {
      expect(Reflect.getMetadata(PATH_METADATA, UsersController)).toBe('users');
    });

    it.each([
      ['create', RequestMethod.POST, '/'],
      ['search', RequestMethod.GET, '/'],
      ['findOne', RequestMethod.GET, ':id'],
      ['update', RequestMethod.PATCH, ':id'],
      ['remove', RequestMethod.DELETE, ':id'],
    ] as const)(
      '%s uses the expected HTTP method and path',
      (method, httpMethod, path) => {
        expect(
          Reflect.getMetadata(
            METHOD_METADATA,
            UsersController.prototype[method],
          ),
        ).toBe(httpMethod);
        expect(
          Reflect.getMetadata(PATH_METADATA, UsersController.prototype[method]),
        ).toBe(path);
      },
    );
  });

  describe('guards and roles', () => {
    const reflector = new Reflector();
    const methods = [
      'create',
      'search',
      'findOne',
      'update',
      'remove',
    ] as const;

    it.each(methods)(
      '%s requires JwtAuthGuard, RolesGuard, and SUPER role',
      (method) => {
        const guards = Reflect.getMetadata(
          GUARDS_METADATA,
          UsersController.prototype[method],
        ) as unknown[];

        expect(guards).toEqual(
          expect.arrayContaining([JwtAuthGuard, RolesGuard]),
        );
        expect(
          reflector.get(ROLES_KEY, UsersController.prototype[method]),
        ).toEqual([Role.SUPER]);
      },
    );
  });

  describe('audit metadata', () => {
    const reflector = new Reflector();

    it.each([
      ['create', 'user.create'],
      ['update', 'user.update'],
      ['remove', 'user.delete'],
    ] as const)('%s is audited as %s', (method, action) => {
      expect(
        reflector.get(AUDIT_KEY, UsersController.prototype[method]),
      ).toEqual(expect.objectContaining({ action, category: 'user' }));
    });
  });

  describe('create', () => {
    it('delegates to UsersService.create', async () => {
      const dto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };
      const created = createUser();
      usersService.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toEqual(
        sanitizeUserForResponse(created),
      );
      expect(usersService.create).toHaveBeenCalledWith(dto);
    });

    it('propagates service errors', async () => {
      usersService.create.mockRejectedValue(new Error('conflict'));

      await expect(
        controller.create({
          firstName: 'A',
          lastName: 'B',
          username: 'ab',
          email: 'a@b.com',
          password: 'Str0ng!P@ssw0rd',
        }),
      ).rejects.toThrow('conflict');
    });
  });

  describe('search', () => {
    it('delegates to UsersService.search and returns sanitized items', async () => {
      const users = [createUser({ googleId: 'g-1' })];
      usersService.search.mockResolvedValue({
        items: users,
        nextCursor: 'cursor-1',
      });

      await expect(
        controller.search(undefined, '10', 'jane', 'true'),
      ).resolves.toEqual({
        items: [sanitizeUserForResponse(users[0])],
        nextCursor: 'cursor-1',
      });
      expect(usersService.search).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 10,
        q: 'jane',
        isActive: true,
      });
    });

    it('parses isActive=false and ignores invalid limit', async () => {
      usersService.search.mockResolvedValue({ items: [], nextCursor: null });

      await controller.search('c', 'nope', undefined, 'false');

      expect(usersService.search).toHaveBeenCalledWith({
        cursor: 'c',
        limit: undefined,
        q: undefined,
        isActive: false,
      });
    });
  });

  describe('findOne', () => {
    it('delegates to UsersService.findById and returns sanitized user', async () => {
      const user = createUser({ googleId: 'g-1' });
      usersService.findById.mockResolvedValue(user);

      await expect(controller.findOne('user-1')).resolves.toEqual(
        sanitizeUserForResponse(user),
      );
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('update', () => {
    it('delegates to UsersService.update and returns sanitized user', async () => {
      const dto: UpdateUserDto = { firstName: 'Janet' };
      const updated = createUser({ firstName: 'Janet', googleId: 'g-1' });
      usersService.update.mockResolvedValue(updated);

      await expect(controller.update('user-1', dto)).resolves.toEqual(
        sanitizeUserForResponse(updated),
      );
      expect(usersService.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates to UsersService.remove and returns sanitized user', async () => {
      const removed = createUser({ googleId: 'g-1' });
      usersService.remove.mockResolvedValue(removed);

      await expect(controller.remove('user-1')).resolves.toEqual(
        sanitizeUserForResponse(removed),
      );
      expect(usersService.remove).toHaveBeenCalledWith('user-1');
    });
  });
});
