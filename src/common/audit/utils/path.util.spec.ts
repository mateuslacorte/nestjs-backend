import {
  firstStringFromPaths,
  getByPath,
} from './path.util';

describe('path.util', () => {
  it('reads nested paths', () => {
    expect(getByPath({ user: { id: 'u1' } }, 'user.id')).toBe('u1');
    expect(getByPath(null, 'a')).toBeUndefined();
    expect(getByPath({ a: 1 }, '')).toBeUndefined();
    expect(getByPath({ a: 1 }, 'a.b')).toBeUndefined();
  });

  it('returns first non-empty string from paths', () => {
    expect(
      firstStringFromPaths({ email: 'a@b.com', username: 'x' }, [
        'missing',
        'email',
      ]),
    ).toBe('a@b.com');
    expect(firstStringFromPaths({ email: '  ' }, 'email')).toBeUndefined();
    expect(firstStringFromPaths({}, undefined)).toBeUndefined();
    expect(firstStringFromPaths({ email: 'a@b.com' }, 'email')).toBe('a@b.com');
  });
});
