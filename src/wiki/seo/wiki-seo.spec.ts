import { WIKI_SEO } from './wiki-seo';

describe('WIKI_SEO', () => {
  it('exposes site identity and twitter card type', () => {
    expect(WIKI_SEO.siteName).toBe('NestJS Boilerplate');
    expect(WIKI_SEO.author).toBe('Mateus M. Côrtes');
    expect(WIKI_SEO.twitterCard).toBe('summary_large_image');
  });

  it('defines default and page descriptions', () => {
    expect(WIKI_SEO.defaultDescription).toContain('NestJS Boilerplate');
    expect(WIKI_SEO.pages.home.description).toContain('documentation');
    expect(WIKI_SEO.pages['error-404'].description).toContain('not found');
    expect(WIKI_SEO.pages['error-500'].description).toContain('server error');
  });

  it('includes English and Portuguese keywords', () => {
    expect(WIKI_SEO.keywords).toContain('NestJS');
    expect(WIKI_SEO.keywords).toContain('boilerplate NestJS');
    expect(WIKI_SEO.keywords).toContain('autenticação JWT');
  });

  it('defines OG image assets with dimensions', () => {
    expect(WIKI_SEO.images.default).toEqual(
      expect.objectContaining({
        path: '/static/og/default.jpg',
        width: 1024,
        height: 537,
      }),
    );
    expect(WIKI_SEO.images.blog.path).toBe('/static/og/blog.jpg');
    expect(WIKI_SEO.images.twitter.path).toBe('/static/og/x.jpg');
  });

  it('covers documented wiki pages', () => {
    const keys = Object.keys(WIKI_SEO.pages);
    expect(keys).toEqual(
      expect.arrayContaining([
        'home',
        'architecture',
        'backend',
        'backend-install',
        'auth',
        'auth-social',
        'auth-social-google',
        'auth-social-facebook',
        'auth-social-twitter',
        'users',
        'email',
        'whatsapp',
        'security',
        'tests',
        'websocket',
        'wsui',
        'error-404',
        'error-500',
      ]),
    );
  });
});
