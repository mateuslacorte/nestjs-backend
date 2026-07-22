export const WIKI_LOCALES = ['pt-BR', 'en-US'] as const;
export type WikiLocale = (typeof WIKI_LOCALES)[number];

export const WIKI_FALLBACK_LOCALE: WikiLocale = 'en-US';
export const WIKI_LOCALE_COOKIE = 'wiki_locale';
export const WIKI_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface WikiLocaleMeta {
    code: WikiLocale;
    flag: string;
    label: string;
    short: string;
}

export const WIKI_LOCALE_META: Record<WikiLocale, Omit<WikiLocaleMeta, 'code'>> = {
    'pt-BR': { flag: '🇧🇷', label: 'Português', short: 'PT' },
    'en-US': { flag: '🇺🇸', label: 'English', short: 'EN' },
};

export function isWikiLocale(value: unknown): value is WikiLocale {
    return typeof value === 'string' && (WIKI_LOCALES as readonly string[]).includes(value);
}

/**
 * Priority: cookie override → Accept-Language → en-US fallback.
 */
export function resolveWikiLocale(
    acceptLanguage?: string | string[],
    cookieLocale?: string,
): WikiLocale {
    if (isWikiLocale(cookieLocale)) {
        return cookieLocale;
    }

    const header = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage;
    if (!header?.trim()) {
        return WIKI_FALLBACK_LOCALE;
    }

    const tags = header
        .split(',')
        .map((part) => {
            const [tag, ...params] = part.trim().split(';');
            const qParam = params.find((p) => p.trim().startsWith('q='));
            const q = qParam ? Number.parseFloat(qParam.split('=')[1]) : 1;
            return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
        })
        .filter((t) => t.tag)
        .sort((a, b) => b.q - a.q);

    for (const { tag } of tags) {
        if (tag === '*' ) {
            continue;
        }
        if (tag === 'pt' || tag.startsWith('pt-')) {
            return 'pt-BR';
        }
        if (tag === 'en' || tag.startsWith('en-')) {
            return 'en-US';
        }
    }

    return WIKI_FALLBACK_LOCALE;
}

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) {
        return {};
    }
    const result: Record<string, string> = {};
    for (const part of cookieHeader.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) {
            continue;
        }
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key) {
            result[key] = decodeURIComponent(value);
        }
    }
    return result;
}

export function buildWikiLocaleCookie(locale: WikiLocale): string {
    return [
        `${WIKI_LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
        'Path=/',
        `Max-Age=${WIKI_LOCALE_COOKIE_MAX_AGE}`,
        'SameSite=Lax',
    ].join('; ');
}
