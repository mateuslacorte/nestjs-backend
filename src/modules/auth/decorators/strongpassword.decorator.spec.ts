import { ValidationArguments } from 'class-validator';
import { StrongPasswordConstraint } from './strongpassword.decorator';

describe('StrongPasswordConstraint', () => {
  const constraint = new StrongPasswordConstraint();
  const args = {} as ValidationArguments;

  it('accepts a valid strong password', () => {
    expect(constraint.validate('Str0ng!P@ssw0rd', args)).toBe(true);
  });

  it.each([
    ['noupper1!', 'missing uppercase'],
    ['NOLOWER1!', 'missing lowercase'],
    ['NoDigits!', 'missing digit'],
    ['NoSpecial1', 'missing special character'],
  ])('rejects password %s (%s)', (password) => {
    expect(constraint.validate(password, args)).toBe(false);
  });

  it.each(['Abcdef1!', 'Pass123!', 'Xyz890#'])(
    'rejects sequential password %s',
    (password) => {
      expect(constraint.validate(password, args)).toBe(false);
    },
  );

  it('returns the default validation message', () => {
    expect(constraint.defaultMessage(args)).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and should not contain sequences like "abc" or "123".',
    );
  });
});
