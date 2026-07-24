import {
  WIKI_FALLBACK_LOCALE,
  WIKI_LOCALE_COOKIE,
  WIKI_LOCALE_COOKIE_MAX_AGE,
  WIKI_LOCALE_META,
  WIKI_LOCALES,
  buildWikiLocaleCookie,
  isWikiLocale,
  parseCookieHeader,
  resolveWikiLocale,
} from './wiki-locale';

describe('wiki-locale', () => {
  describe('constants', () => {
    it('exposes supported locales and fallback', () => {
      expect(WIKI_LOCALES).toEqual(['pt-BR', 'en-US']);
      expect(WIKI_FALLBACK_LOCALE).toBe('en-US');
      expect(WIKI_LOCALE_COOKIE).toBe('wiki_locale');
      expect(WIKI_LOCALE_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    });

    it('defines locale metadata for each locale', () => {
      expect(WIKI_LOCALE_META['pt-BR']).toEqual({
        flag: '🇧🇷',
        label: 'Português',
        short: 'PT',
      });
      expect(WIKI_LOCALE_META['en-US']).toEqual({
        flag: '🇺🇸',
        label: 'English',
        short: 'EN',
      });
    });
  });

  describe('isWikiLocale', () => {
    it('accepts known locales', () => {
      expect(isWikiLocale('pt-BR')).toBe(true);
      expect(isWikiLocale('en-US')).toBe(true);
    });

    it('rejects unknown or non-string values', () => {
      expect(isWikiLocale('fr-FR')).toBe(false);
      expect(isWikiLocale('pt')).toBe(false);
      expect(isWikiLocale('')).toBe(false);
      expect(isWikiLocale(undefined)).toBe(false);
      expect(isWikiLocale(null)).toBe(false);
      expect(isWikiLocale(1)).toBe(false);
    });
  });

  describe('resolveWikiLocale', () => {
    it('prefers a valid cookie locale over Accept-Language', () => {
      expect(resolveWikiLocale('en-US,en;q=0.9', 'pt-BR')).toBe('pt-BR');
    });

    it('ignores invalid cookie and uses Accept-Language', () => {
      expect(resolveWikiLocale('pt-BR', 'fr-FR')).toBe('pt-BR');
    });

    it('falls back to en-US when header is missing or blank', () => {
      expect(resolveWikiLocale(undefined)).toBe('en-US');
      expect(resolveWikiLocale('')).toBe('en-US');
      expect(resolveWikiLocale('   ')).toBe('en-US');
    });

    it('joins array Accept-Language headers', () => {
      expect(resolveWikiLocale(['pt-BR', 'en;q=0.8'])).toBe('pt-BR');
    });

    it('maps pt and pt-* tags to pt-BR', () => {
      expect(resolveWikiLocale('pt')).toBe('pt-BR');
      expect(resolveWikiLocale('pt-PT')).toBe('pt-BR');
      expect(resolveWikiLocale('PT-br')).toBe('pt-BR');
    });

    it('maps en and en-* tags to en-US', () => {
      expect(resolveWikiLocale('en')).toBe('en-US');
      expect(resolveWikiLocale('en-GB')).toBe('en-US');
    });

    it('respects q-values (higher quality first)', () => {
      expect(resolveWikiLocale('en-US;q=0.8, pt-BR;q=0.9')).toBe('pt-BR');
      expect(resolveWikiLocale('pt;q=0.2, en;q=0.9')).toBe('en-US');
    });

    it('skips wildcard tags and falls through', () => {
      expect(resolveWikiLocale('*;q=0.1')).toBe('en-US');
      expect(resolveWikiLocale('*;q=1, fr;q=0.9')).toBe('en-US');
    });

    it('falls back for unsupported languages', () => {
      expect(resolveWikiLocale('fr-FR, de;q=0.8')).toBe('en-US');
    });

    it('treats non-finite q as 1', () => {
      expect(resolveWikiLocale('pt;q=abc, en;q=0.1')).toBe('pt-BR');
    });
  });

  describe('parseCookieHeader', () => {
    it('returns empty object for missing header', () => {
      expect(parseCookieHeader(undefined)).toEqual({});
      expect(parseCookieHeader('')).toEqual({});
    });

    it('parses multiple cookies and decodes values', () => {
      expect(
        parseCookieHeader('wiki_locale=pt-BR; other=a%20b; empty='),
      ).toEqual({
        wiki_locale: 'pt-BR',
        other: 'a b',
        empty: '',
      });
    });

    it('skips segments without "="', () => {
      expect(parseCookieHeader('solo; wiki_locale=en-US')).toEqual({
        wiki_locale: 'en-US',
      });
    });

    it('skips empty keys', () => {
      expect(parseCookieHeader('=value; wiki_locale=en-US')).toEqual({
        wiki_locale: 'en-US',
      });
    });
  });

  describe('buildWikiLocaleCookie', () => {
    it('builds a Path=/ SameSite=Lax cookie with max-age', () => {
      expect(buildWikiLocaleCookie('pt-BR')).toBe(
        [
          'wiki_locale=pt-BR',
          'Path=/',
          `Max-Age=${WIKI_LOCALE_COOKIE_MAX_AGE}`,
          'SameSite=Lax',
        ].join('; '),
      );
    });

    it('encodes locale values', () => {
      expect(buildWikiLocaleCookie('en-US')).toContain(
        `wiki_locale=${encodeURIComponent('en-US')}`,
      );
    });
  });
});
