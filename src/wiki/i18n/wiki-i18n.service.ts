import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
    WIKI_FALLBACK_LOCALE,
    WIKI_LOCALES,
    WikiLocale,
} from './wiki-locale';

type MessageTree = Record<string, unknown>;

@Injectable()
export class WikiI18nService implements OnModuleInit {
    private readonly catalogs = new Map<WikiLocale, MessageTree>();

    onModuleInit(): void {
        for (const locale of WIKI_LOCALES) {
            this.catalogs.set(locale, this.loadLocale(locale));
        }
    }

    t(locale: WikiLocale, key: string): string {
        const value = this.get(locale, key);
        if (typeof value === 'string') {
            return value;
        }
        return key;
    }

    /** Returns any value (string, array, object) with en-US fallback. */
    get(locale: WikiLocale, key: string): unknown {
        return (
            this.getByKey(this.catalogs.get(locale), key) ??
            this.getByKey(this.catalogs.get(WIKI_FALLBACK_LOCALE), key)
        );
    }

    private loadLocale(locale: WikiLocale): MessageTree {
        const dir = this.resolveLocalesDir(locale);
        if (!dir) {
            return {};
        }

        const merged: MessageTree = {};
        for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
            const raw = readFileSync(join(dir, file), 'utf8');
            const parsed = JSON.parse(raw) as MessageTree;
            Object.assign(merged, parsed);
        }
        return merged;
    }

    private resolveLocalesDir(locale: WikiLocale): string | null {
        const candidates = [
            join(__dirname, 'locales', locale),
            join(process.cwd(), 'src', 'wiki', 'i18n', 'locales', locale),
        ];
        return candidates.find((p) => existsSync(p)) ?? null;
    }

    private getByKey(tree: MessageTree | undefined, key: string): unknown {
        if (!tree) {
            return undefined;
        }
        return key.split('.').reduce<unknown>((acc, part) => {
            if (acc && typeof acc === 'object' && part in (acc as MessageTree)) {
                return (acc as MessageTree)[part];
            }
            return undefined;
        }, tree);
    }
}
