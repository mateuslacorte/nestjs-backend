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
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findAll: jest.fn(),
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
      ['findAll', RequestMethod.GET, '/'],
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
      'findAll',
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

  describe('findAll', () => {
    it('delegates to UsersService.findAll and returns sanitized users', async () => {
      const users = [createUser({ googleId: 'g-1' })];
      usersService.findAll.mockResolvedValue(users);

      await expect(controller.findAll()).resolves.toEqual([
        sanitizeUserForResponse(users[0]),
      ]);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
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
