import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let service: { search: jest.Mock };
  let controller: AuditController;
  const reflector = new Reflector();

  beforeEach(() => {
    service = { search: jest.fn() };
    controller = new AuditController(service as unknown as AuditService);
  });

  it('is mounted at audit with SUPER guards', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditController)).toBe('audit');
    expect(reflector.getAllAndOverride(ROLES_KEY, [AuditController])).toEqual([
      Role.SUPER,
    ]);
  });

  it('parses query filters for search', async () => {
    service.search.mockResolvedValue({ items: [], nextCursor: null });
    await controller.search(
      'cur',
      '10',
      'login',
      '1.1.1.1',
      'true',
      'auth.login',
      'auth',
      'user-1',
      'google',
    );
    expect(service.search).toHaveBeenCalledWith({
      cursor: 'cur',
      limit: 10,
      q: 'login',
      ip: '1.1.1.1',
      success: true,
      action: 'auth.login',
      category: 'auth',
      userId: 'user-1',
      provider: 'google',
    });
  });

  it('parses success false and ignores invalid limit', async () => {
    service.search.mockResolvedValue({ items: [], nextCursor: null });
    await controller.search(undefined, 'nope', undefined, undefined, 'false');
    expect(service.search).toHaveBeenCalledWith({
      cursor: undefined,
      limit: undefined,
      q: undefined,
      ip: undefined,
      success: false,
      action: undefined,
      category: undefined,
      userId: undefined,
      provider: undefined,
    });
  });
});
