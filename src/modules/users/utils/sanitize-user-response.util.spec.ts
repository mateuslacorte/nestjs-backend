import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from '../interfaces/user.interface';
import {
    sanitizeUserForResponse,
    USER_PROVIDER_ID_FIELDS,
} from './sanitize-user-response.util';

function createUser(overrides: Partial<IUser> = {}): IUser {
    return {
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'hashed',
        isActive: true,
        roles: [Role.USER],
        googleId: 'google-1',
        activeDirectoryId: 'ad-guid-001',
        passwordResetToken: '123456',
        emailVerificationToken: '654321',
        ...overrides,
    };
}

describe('sanitizeUserForResponse', () => {
    it('returns only public profile fields', () => {
        expect(sanitizeUserForResponse(createUser())).toEqual({
            id: 'user-1',
            username: 'janesmith',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            isActive: true,
            roles: [Role.USER],
        });
    });

    it.each(USER_PROVIDER_ID_FIELDS)(
        'strips provider field %s',
        (field) => {
            const sanitized = sanitizeUserForResponse(
                createUser({ [field]: 'provider-id' } as Partial<IUser>),
            );
            expect(sanitized).not.toHaveProperty(field);
        },
    );
});
