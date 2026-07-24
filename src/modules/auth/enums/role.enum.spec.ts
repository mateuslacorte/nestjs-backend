import { Role } from './role.enum';

describe('Role enum', () => {
  it('defines the expected role values', () => {
    expect(Role.SUPER).toBe('super');
    expect(Role.ADMIN).toBe('admin');
    expect(Role.MANAGER).toBe('manager');
    expect(Role.USER).toBe('user');
  });

  it('contains exactly the four known roles', () => {
    expect(Object.values(Role)).toEqual([
      'super',
      'admin',
      'manager',
      'user',
    ]);
  });
});
