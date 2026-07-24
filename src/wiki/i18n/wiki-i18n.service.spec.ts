import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { WikiI18nService } from './wiki-i18n.service';

describe('WikiI18nService', () => {
  let service: WikiI18nService;

  beforeEach(() => {
    service = new WikiI18nService();
    service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('loads real locale catalogs from disk', () => {
      expect(service.t('en-US', 'home.meta.title')).not.toBe('home.meta.title');
      expect(service.t('pt-BR', 'home.meta.title')).not.toBe('home.meta.title');
      expect(service.t('en-US', 'home.meta.title')).not.toEqual(
        service.t('pt-BR', 'home.meta.title'),
      );
    });
  });

  describe('t', () => {
    it('returns translated string for a dotted key', () => {
      const title = service.t('en-US', 'home.meta.title');
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('returns the key when the value is not a string', () => {
      // home.meta is an object in locale JSON
      expect(service.t('en-US', 'home.meta')).toBe('home.meta');
    });

    it('returns the key when missing in both locale and fallback', () => {
      expect(service.t('en-US', 'does.not.exist')).toBe('does.not.exist');
    });
  });

  describe('get', () => {
    it('returns nested values including objects', () => {
      const meta = service.get('en-US', 'home.meta');
      expect(meta).toEqual(
        expect.objectContaining({
          title: expect.any(String),
        }),
      );
    });

    it('falls back to en-US when key is missing in pt-BR', () => {
      const catalogs = (
        service as unknown as {
          catalogs: Map<string, Record<string, unknown>>;
        }
      ).catalogs;
      catalogs.set('pt-BR', {});
      catalogs.set('en-US', { only: { en: 'from-fallback' } });

      expect(service.get('pt-BR', 'only.en')).toBe('from-fallback');
      expect(service.t('pt-BR', 'only.en')).toBe('from-fallback');
    });

    it('returns undefined for completely missing keys', () => {
      expect(service.get('en-US', 'totally.missing.key')).toBeUndefined();
    });
  });

  describe('loadLocale edge cases', () => {
    const tempLocale = 'en-US';
    const tempDir = join(
      process.cwd(),
      'src',
      'wiki',
      'i18n',
      'locales',
      '__tmp_test_locale__',
    );

    afterEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns empty catalog when locale directory is missing', () => {
      const isolated = new WikiI18nService();
      const loadLocale = (
        isolated as unknown as {
          loadLocale: (locale: typeof tempLocale) => Record<string, unknown>;
          resolveLocalesDir: (locale: string) => string | null;
        }
      );

      jest.spyOn(loadLocale, 'resolveLocalesDir').mockReturnValue(null);
      expect(loadLocale.loadLocale('en-US')).toEqual({});
    });

    it('merges multiple json files from a locale directory', () => {
      mkdirSync(tempDir, { recursive: true });
      writeFileSync(
        join(tempDir, 'a.json'),
        JSON.stringify({ a: { value: 1 } }),
        'utf8',
      );
      writeFileSync(
        join(tempDir, 'b.json'),
        JSON.stringify({ b: { value: 2 } }),
        'utf8',
      );
      writeFileSync(join(tempDir, 'ignore.txt'), 'nope', 'utf8');

      const isolated = new WikiI18nService();
      const loadLocale = (
        isolated as unknown as {
          loadLocale: (locale: string) => Record<string, unknown>;
          resolveLocalesDir: (locale: string) => string | null;
        }
      );
      jest.spyOn(loadLocale, 'resolveLocalesDir').mockReturnValue(tempDir);

      expect(loadLocale.loadLocale('en-US')).toEqual({
        a: { value: 1 },
        b: { value: 2 },
      });
    });
  });
});
