import { Role } from '@modules/auth/enums/role.enum';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

describe('parseOAuthDefaultRoles', () => {
  it('returns [] for undefined, empty, or whitespace', () => {
    expect(parseOAuthDefaultRoles(undefined)).toEqual([]);
    expect(parseOAuthDefaultRoles('')).toEqual([]);
    expect(parseOAuthDefaultRoles('   ')).toEqual([]);
  });

  it('parses a single role', () => {
    expect(parseOAuthDefaultRoles('user')).toEqual([Role.USER]);
  });

  it('parses comma-separated roles', () => {
    expect(parseOAuthDefaultRoles('user,manager')).toEqual([
      Role.USER,
      Role.MANAGER,
    ]);
  });

  it('trims and lowercases tokens', () => {
    expect(parseOAuthDefaultRoles(' USER , Admin ')).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });

  it('drops invalid tokens', () => {
    expect(parseOAuthDefaultRoles('user,bogus,admin')).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });

  it('accepts SUPER case-insensitively', () => {
    expect(parseOAuthDefaultRoles('SUPER')).toEqual([Role.SUPER]);
  });
});
