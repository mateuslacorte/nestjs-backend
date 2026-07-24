import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('exports ROLES_KEY', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('stores the provided roles on the method', () => {
    class SampleController {
      @Roles(Role.ADMIN, Role.MANAGER)
      adminOnly() {
        return 'ok';
      }
    }

    const reflector = new Reflector();
    expect(
      reflector.get(ROLES_KEY, SampleController.prototype.adminOnly),
    ).toEqual([Role.ADMIN, Role.MANAGER]);
  });

  it('stores a single role', () => {
    class SampleController {
      @Roles(Role.USER)
      userOnly() {
        return 'ok';
      }
    }

    const reflector = new Reflector();
    expect(
      reflector.get(ROLES_KEY, SampleController.prototype.userOnly),
    ).toEqual([Role.USER]);
  });

  it('stores an empty roles array when called with no arguments', () => {
    class SampleController {
      @Roles()
      open() {
        return 'ok';
      }
    }

    const reflector = new Reflector();
    expect(reflector.get(ROLES_KEY, SampleController.prototype.open)).toEqual(
      [],
    );
  });
});
