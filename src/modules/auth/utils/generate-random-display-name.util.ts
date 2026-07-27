import { randomInt } from 'crypto';

const ADJECTIVES = [
    'Fearful',
    'Friendly',
    'Brave',
    'Curious',
    'Gentle',
    'Happy',
    'Quiet',
    'Swift',
    'Clever',
    'Calm',
    'Bold',
    'Lucky',
    'Mighty',
    'Noble',
    'Sunny',
    'Witty',
    'Cosmic',
    'Silent',
    'Golden',
    'Rusty',
] as const;

const NOUNS = [
    'Bear',
    'Joe',
    'Fox',
    'Owl',
    'Wolf',
    'Hawk',
    'Lynx',
    'Panda',
    'Tiger',
    'Whale',
    'Robin',
    'Otter',
    'Badger',
    'Falcon',
    'Moose',
    'Raven',
    'Sparrow',
    'Dragon',
    'Phoenix',
    'Koala',
] as const;

/**
 * Generates a random display name as adjective + noun (e.g. Fearful Bear → firstName/lastName).
 */
export function generateRandomDisplayName(): {
    firstName: string;
    lastName: string;
} {
    const firstName = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const lastName = NOUNS[randomInt(NOUNS.length)];
    return { firstName, lastName };
}

/** Exported for unit tests */
export const DISPLAY_NAME_ADJECTIVES = ADJECTIVES;
export const DISPLAY_NAME_NOUNS = NOUNS;
