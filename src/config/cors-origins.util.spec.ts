import {
  buildSelfOrigins,
  createCorsOriginDelegate,
  isOriginAllowed,
  normalizeOrigin,
  parseOriginList,
  resolveCorsOriginsFromEnv,
} from './cors-origins.util';

describe('cors-origins.util', () => {
  describe('normalizeOrigin', () => {
    it('trims, strips trailing slash, and returns URL origin', () => {
      expect(normalizeOrigin(' https://a.com/path/ ')).toBe('https://a.com');
    });

    it('preserves non-default ports in the origin', () => {
      expect(normalizeOrigin('https://a.com:8443/')).toBe('https://a.com:8443');
    });

    it('returns null for empty or whitespace input', () => {
      expect(normalizeOrigin('')).toBeNull();
      expect(normalizeOrigin('   ')).toBeNull();
      expect(normalizeOrigin('/')).toBeNull();
    });

    it('returns null for non-http(s) or bare hostnames', () => {
      expect(normalizeOrigin('ftp://a.com')).toBeNull();
      expect(normalizeOrigin('localhost')).toBeNull();
      expect(normalizeOrigin('http://[invalid')).toBeNull();
    });
  });

  describe('parseOriginList', () => {
    it('returns [] for null, undefined, or blank', () => {
      expect(parseOriginList(undefined)).toEqual([]);
      expect(parseOriginList(null)).toEqual([]);
      expect(parseOriginList('')).toEqual([]);
      expect(parseOriginList('   ')).toEqual([]);
    });

    it('parses comma-separated origins and skips invalid parts', () => {
      expect(
        parseOriginList('https://a.com, bad, https://b.com/'),
      ).toEqual(['https://a.com', 'https://b.com']);
    });
  });

  describe('buildSelfOrigins', () => {
    it('defaults to local http pair on port 3000', () => {
      expect(buildSelfOrigins({})).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('uses custom port for localhost', () => {
      const origins = buildSelfOrigins({ host: 'localhost', port: 4000 });
      expect(origins).toEqual(
        expect.arrayContaining([
          'http://localhost:4000',
          'http://127.0.0.1:4000',
        ]),
      );
    });

    it('uses non-finite port as 3000', () => {
      expect(buildSelfOrigins({ port: Number.NaN })).toEqual(
        expect.arrayContaining(['http://localhost:3000']),
      );
    });

    it('builds http origin for bare remote hostname', () => {
      expect(
        buildSelfOrigins({ host: 'api.example.com', port: 3000 }),
      ).toContain('http://api.example.com:3000');
    });

    it('adds origin and listen port for remote URL host without port', () => {
      const origins = buildSelfOrigins({
        host: 'https://api.example.com',
        port: 3000,
      });
      expect(origins).toEqual(
        expect.arrayContaining([
          'https://api.example.com',
          'https://api.example.com:3000',
        ]),
      );
    });

    it('does not add extra listen port when port is 443', () => {
      const origins = buildSelfOrigins({
        host: 'https://api.example.com',
        port: 443,
      });
      expect(origins).toContain('https://api.example.com');
      expect(origins).not.toContain('https://api.example.com:443');
    });

    it('does not add extra listen port when port is 80', () => {
      const origins = buildSelfOrigins({
        host: 'http://api.example.com',
        port: 80,
      });
      expect(origins).toContain('http://api.example.com');
      expect(origins).not.toContain('http://api.example.com:80');
    });

    it('uses local pair for loopback URL host', () => {
      expect(
        buildSelfOrigins({ host: 'http://localhost', port: 3000 }),
      ).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('uses local pair for 127.0.0.1 bare host', () => {
      expect(buildSelfOrigins({ host: '127.0.0.1', port: 3000 })).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('includes publicUrl when provided', () => {
      expect(
        buildSelfOrigins({
          publicUrl: 'https://app.example.com/',
        }),
      ).toContain('https://app.example.com');
    });

    it('falls back to local http pair when URL host is invalid', () => {
      const origins = buildSelfOrigins({
        host: 'http://[bad',
        port: 3000,
      });
      expect(origins).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('trims host and strips trailing slash', () => {
      expect(
        buildSelfOrigins({ host: '  api.example.com/ ', port: 3000 }),
      ).toContain('http://api.example.com:3000');
    });

    it('treats whitespace-only host as localhost', () => {
      expect(buildSelfOrigins({ host: '   ', port: 3000 })).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('ignores invalid publicUrl values', () => {
      const origins = buildSelfOrigins({
        publicUrl: 'not-a-url',
        host: 'api.example.com',
        port: 3000,
      });
      expect(origins).toEqual(['http://api.example.com:3000']);
    });
  });

  describe('resolveCorsOriginsFromEnv', () => {
    it('uses process.env when no env argument is passed', () => {
      const previousHost = process.env.HOST;
      process.env.HOST = 'localhost';
      delete process.env.CORS_ORIGINS;

      try {
        expect(resolveCorsOriginsFromEnv()).toEqual(
          expect.arrayContaining([
            'http://localhost:3000',
            'http://127.0.0.1:3000',
          ]),
        );
      } finally {
        if (previousHost === undefined) {
          delete process.env.HOST;
        } else {
          process.env.HOST = previousHost;
        }
      }
    });
    it('merges self origins with CORS_ORIGINS and dedupes', () => {
      const origins = resolveCorsOriginsFromEnv({
        HOST: 'localhost',
        PORT: '3000',
        CORS_ORIGINS: 'http://localhost:3000,https://client.example.com',
      });

      expect(origins).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'https://client.example.com',
        ]),
      );
      expect(origins.filter((o) => o === 'http://localhost:3000')).toHaveLength(
        1,
      );
    });

    it('prefers APP_URL over PUBLIC_URL and handles non-finite PORT', () => {
      const origins = resolveCorsOriginsFromEnv({
        PORT: 'abc',
        APP_URL: 'https://app.example.com/',
        PUBLIC_URL: 'https://ignored.example.com',
      });

      expect(origins).toContain('https://app.example.com');
      expect(origins).toEqual(
        expect.arrayContaining([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
      );
    });

    it('uses PUBLIC_URL when APP_URL is unset', () => {
      expect(
        resolveCorsOriginsFromEnv({
          PUBLIC_URL: 'https://public.example.com',
        }),
      ).toContain('https://public.example.com');
    });
  });

  describe('isOriginAllowed', () => {
    it('allows missing origin', () => {
      expect(isOriginAllowed(undefined, [])).toBe(true);
    });

    it('checks exact membership', () => {
      expect(isOriginAllowed('https://a.com', ['https://a.com'])).toBe(true);
      expect(isOriginAllowed('https://b.com', ['https://a.com'])).toBe(false);
    });
  });

  describe('createCorsOriginDelegate', () => {
    it('invokes callback with null error and allow flag', () => {
      const delegate = createCorsOriginDelegate(['https://a.com']);
      const callback = jest.fn();

      delegate('https://a.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      callback.mockClear();
      delegate('https://b.com', callback);
      expect(callback).toHaveBeenCalledWith(null, false);

      callback.mockClear();
      delegate(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});
