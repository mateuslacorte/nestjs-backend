import {
  requestHost,
  requestOriginalUrl,
  requestPath,
  requestProtocol,
} from './app-http';

describe('app-http helpers', () => {
  it('requestPath prefers explicit path then strips query from url', () => {
    expect(requestPath({ path: '/a', url: '/b?x=1' })).toBe('/a');
    expect(requestPath({ url: '/b?x=1' })).toBe('/b');
    expect(requestPath({ url: '' })).toBe('/');
  });

  it('requestOriginalUrl prefers originalUrl then url', () => {
    expect(requestOriginalUrl({ originalUrl: '/x?y=1', url: '/z' })).toBe(
      '/x?y=1',
    );
    expect(requestOriginalUrl({ url: '/z?q=1' })).toBe('/z?q=1');
  });

  it('requestHost uses get(), hostname/host header, then headers.host', () => {
    expect(
      requestHost({
        get: (name) => (name === 'host' ? 'via-get' : undefined),
        headers: {},
        hostname: 'ignored',
      }),
    ).toBe('via-get');
    expect(
      requestHost({
        headers: { host: 'h.example' },
        hostname: 'h.example',
      }),
    ).toBe('h.example');
    expect(requestHost({ headers: { host: 'only-header' }, hostname: '' })).toBe(
      'only-header',
    );
  });

  it('requestProtocol prefers x-forwarded-proto then protocol', () => {
    expect(
      requestProtocol({
        headers: { 'x-forwarded-proto': 'https, http' },
        protocol: 'http',
      }),
    ).toBe('https');
    expect(
      requestProtocol({
        headers: {},
        protocol: 'http',
      }),
    ).toBe('http');
  });
});
