import { UsersService } from '@modules/users/users.service';
import { Role } from '@modules/auth/enums/role.enum';
import { SessionSerializer } from './session.serializer';

jest.mock('@nestjs/graphql', () => ({
  registerEnumType: jest.fn(),
  Field: () => () => undefined,
  ObjectType: () => () => undefined,
  InputType: () => () => undefined,
}));

jest.mock('@modules/users/users.service', () => ({
  UsersService: class UsersService {},
}));

type SessionUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
};

function createUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-serializer-1',
    username: 'jane',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    roles: [Role.USER],
    ...overrides,
  };
}

describe('SessionSerializer', () => {
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;
  let serializer: SessionSerializer;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
    };
    serializer = new SessionSerializer(
      usersService as unknown as UsersService,
    );
  });

  describe('serializeUser', () => {
    it('calls done with null error and user id', () => {
      const done = jest.fn();
      const user = createUser({ id: 'serialize-id-99' });

      serializer.serializeUser(user, done);

      expect(done).toHaveBeenCalledWith(null, 'serialize-id-99');
    });
  });

  describe('deserializeUser', () => {
    it('calls done with user when found', async () => {
      const done = jest.fn();
      const user = createUser();
      usersService.findById.mockResolvedValue(user);

      await serializer.deserializeUser('user-serializer-1', done);

      expect(usersService.findById).toHaveBeenCalledWith('user-serializer-1');
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it('calls done with error when user is not found', async () => {
      const done = jest.fn();
      usersService.findById.mockResolvedValue(null);

      await serializer.deserializeUser('missing-user', done);

      expect(done).toHaveBeenCalledWith(expect.any(Error));
      expect(done.mock.calls[0][0].message).toBe('User not found');
    });

    it('calls done with error when findById throws', async () => {
      const done = jest.fn();
      const dbError = new Error('Database unavailable');
      usersService.findById.mockRejectedValue(dbError);

      await serializer.deserializeUser('user-serializer-1', done);

      expect(done).toHaveBeenCalledWith(dbError);
    });
  });
});
