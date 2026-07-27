import {
    DISPLAY_NAME_ADJECTIVES,
    DISPLAY_NAME_NOUNS,
    generateRandomDisplayName,
} from './generate-random-display-name.util';

describe('generateRandomDisplayName', () => {
    it('returns non-empty adjective and noun from fixed lists', () => {
        const { firstName, lastName } = generateRandomDisplayName();

        expect(DISPLAY_NAME_ADJECTIVES).toContain(firstName);
        expect(DISPLAY_NAME_NOUNS).toContain(lastName);
        expect(firstName.length).toBeGreaterThan(0);
        expect(lastName.length).toBeGreaterThan(0);
    });

    it('has non-empty word lists', () => {
        expect(DISPLAY_NAME_ADJECTIVES.length).toBeGreaterThan(0);
        expect(DISPLAY_NAME_NOUNS.length).toBeGreaterThan(0);
    });

    it('produces varied combinations over many calls', () => {
        const combos = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const { firstName, lastName } = generateRandomDisplayName();
            combos.add(`${firstName} ${lastName}`);
        }
        expect(combos.size).toBeGreaterThan(1);
    });
});
