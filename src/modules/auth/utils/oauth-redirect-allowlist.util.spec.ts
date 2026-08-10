import { isAllowedOAuthRedirect } from './oauth-redirect-allowlist.util';

describe('isAllowedOAuthRedirect', () => {
  it('allows exact allowlist matches', () => {
    expect(
      isAllowedOAuthRedirect('https://app.example.com/cb', [
        'https://app.example.com/cb',
      ]),
    ).toBe(true);
    expect(
      isAllowedOAuthRedirect('myapp://success', ['myapp://success']),
    ).toBe(true);
  });

  it('rejects prefix / lookalike redirects', () => {
    expect(
      isAllowedOAuthRedirect('https://app.example.com.evil.com', [
        'https://app.example.com',
      ]),
    ).toBe(false);
    expect(
      isAllowedOAuthRedirect('myapp://successful-phish', ['myapp://success']),
    ).toBe(false);
    expect(
      isAllowedOAuthRedirect('https://app.example.com/cb/extra', [
        'https://app.example.com/cb',
      ]),
    ).toBe(false);
  });

  it('rejects empty redirect or empty allowlist', () => {
    expect(isAllowedOAuthRedirect('', ['https://x'])).toBe(false);
    expect(isAllowedOAuthRedirect('https://x', [])).toBe(false);
  });
});
