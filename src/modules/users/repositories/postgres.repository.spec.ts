import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '@modules/auth/enums/role.enum';
import { UserPostgresRepository } from './postgres.repository';
import { UserEntity } from '../entities/user.entity';
import { CacheService } from '@common/cache/cache.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUser } from '../interfaces/user.interface';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

type MockRepo = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

function createEntity(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: '$2b$10$hashedpasswordvaluehere',
    isActive: true,
    roles: [Role.USER],
    googleId: null,
    facebookId: null,
    ...overrides,
  } as UserEntity;
}

describe('UserPostgresRepository', () => {
  let typeOrmRepo: MockRepo;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delPattern: jest.Mock;
  };
  let repository: UserPostgresRepository;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const bcryptHash = bcrypt.hash as jest.Mock;

  beforeEach(() => {
    process.env.BCRYPT_HASH_FACTOR = '10';
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    typeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };
    bcryptHash.mockResolvedValue('$2b$10$hashedpasswordvaluehere');

    repository = new UserPostgresRepository(
      typeOrmRepo as unknown as Repository<UserEntity>,
      cacheService as unknown as CacheService,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    delete process.env.BCRYPT_HASH_FACTOR;
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
    };

    it('creates a hashed user, clears cache, and omits password by default', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.create(dto);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: dto.email }, { username: dto.username }],
      });
      expect(bcryptHash).toHaveBeenCalledWith('Str0ng!P@ssw0rd', 10);
      expect(typeOrmRepo.create).toHaveBeenCalledWith({
        ...dto,
        password: '$2b$10$hashedpasswordvaluehere',
        googleId: null,
        facebookId: null,
        isActive: true,
        roles: [],
      });
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('jane@example.com');
    });

    it('returns password when includePassword=true', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.create(dto, true);

      expect(result.password).toBe('$2b$10$hashedpasswordvaluehere');
    });

    it('stores null password for OAuth-only users', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const oauthDto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        googleId: 'g-1',
      };
      const entity = createEntity({ password: null, googleId: 'g-1' });
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.create(oauthDto);

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
          googleId: 'g-1',
          facebookId: null,
        }),
      );
    });

    it('uses provided isActive and roles', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity({ isActive: false, roles: [Role.ADMIN] });
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.create({
        ...dto,
        isActive: false,
        roles: [Role.ADMIN],
      });

      expect(typeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          roles: [Role.ADMIN],
        }),
      );
    });

    it('throws ConflictException when email or username exists', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      await expect(repository.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(repository.create(dto)).rejects.toThrow(
        'User with this email or username already exists',
      );
      expect(typeOrmRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when googleId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ googleId: 'g-1' }));

      await expect(
        repository.create({ ...dto, googleId: 'g-1' }),
      ).rejects.toThrow('User with this Google account already exists');
    });

    it('throws ConflictException when facebookId already exists', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createEntity({ facebookId: 'fb-1' }));

      await expect(
        repository.create({ ...dto, facebookId: 'fb-1' }),
      ).rejects.toThrow('User with this Facebook account already exists');
    });

    it('works without CacheService', async () => {
      repository = new UserPostgresRepository(
        typeOrmRepo as unknown as Repository<UserEntity>,
      );
      typeOrmRepo.findOne.mockResolvedValue(null);
      const entity = createEntity();
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await expect(repository.create(dto)).resolves.toMatchObject({
        email: 'jane@example.com',
      });
    });
  });

  describe('findAll', () => {
    it('returns users without passwords', async () => {
      typeOrmRepo.find.mockResolvedValue([
        createEntity(),
        createEntity({ id: 'user-2', email: 'other@example.com' }),
      ]);

      const result = await repository.findAll();

      expect(typeOrmRepo.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result![0]).not.toHaveProperty('password');
    });

    it('returns empty array when no users exist', async () => {
      typeOrmRepo.find.mockResolvedValue([]);
      await expect(repository.findAll()).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns null when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findById('missing')).resolves.toBeNull();
    });

    it('omits password by default', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      const result = await repository.findById('user-1');

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('includes password when requested', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      const result = await repository.findById('user-1', true);

      expect(result?.password).toBe('$2b$10$hashedpasswordvaluehere');
    });
  });

  describe('findByEmail', () => {
    it('returns null when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByEmail('x@y.com')).resolves.toBeNull();
    });

    it('omits password by default and includes when requested', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());

      await expect(
        repository.findByEmail('jane@example.com'),
      ).resolves.not.toHaveProperty('password');

      typeOrmRepo.findOne.mockResolvedValue(createEntity());
      await expect(
        repository.findByEmail('jane@example.com', true),
      ).resolves.toHaveProperty(
        'password',
        '$2b$10$hashedpasswordvaluehere',
      );
    });
  });

  describe('findByUsername', () => {
    it('returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity());
      await expect(repository.findByUsername('janesmith')).resolves.toEqual(
        expect.objectContaining({ username: 'janesmith' }),
      );

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByUsername('missing')).resolves.toBeNull();
    });
  });

  describe('findByGoogleId / findByFacebookId', () => {
    it('finds by googleId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(createEntity({ googleId: 'g-1' }));

      await expect(repository.findByGoogleId('g-1')).resolves.not.toHaveProperty(
        'password',
      );
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { googleId: 'g-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(createEntity({ googleId: 'g-1' }));
      await expect(
        repository.findByGoogleId('g-1', true),
      ).resolves.toHaveProperty('password');
    });

    it('returns null when googleId is missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByGoogleId('g-x')).resolves.toBeNull();
    });

    it('finds by facebookId with optional password', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ facebookId: 'fb-1' }),
      );

      await expect(
        repository.findByFacebookId('fb-1'),
      ).resolves.not.toHaveProperty('password');
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { facebookId: 'fb-1' },
      });

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByFacebookId('fb-x')).resolves.toBeNull();
    });
  });

  describe('token lookups', () => {
    it('findByEmailVerificationToken returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ emailVerificationToken: 'tok' }),
      );
      await expect(
        repository.findByEmailVerificationToken('tok'),
      ).resolves.toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { emailVerificationToken: 'tok' },
      });

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(
        repository.findByEmailVerificationToken('missing'),
      ).resolves.toBeNull();
    });

    it('findByPasswordToken returns omitted user or null', async () => {
      typeOrmRepo.findOne.mockResolvedValue(
        createEntity({ passwordResetToken: 'reset' }),
      );
      await expect(repository.findByPasswordToken('reset')).resolves.toEqual(
        expect.objectContaining({ id: 'user-1' }),
      );

      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByPasswordToken('x')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when user is missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hashes plain password and omits it from the result', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const result = await repository.update('user-1', {
        password: 'Str0ng!P@ssw0rd',
      });

      expect(bcryptHash).toHaveBeenCalledWith('Str0ng!P@ssw0rd', 10);
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });

    it('does not re-hash already hashed passwords', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockImplementation(async (user) => user);
      const hashed = '$2a$10$abcdefghijklmnopqrstuv';

      await repository.update('user-1', { password: hashed });

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(entity.password).toBe(hashed);
    });

    it('throws ConflictException when username/email already in use', async () => {
      typeOrmRepo.findOne
        .mockResolvedValueOnce(createEntity())
        .mockResolvedValueOnce(createEntity({ id: 'other' }));

      await expect(
        repository.update('user-1', { username: 'taken' }),
      ).rejects.toThrow('Username or email already in use');
    });

    it('checks both username and email conflicts', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne
        .mockResolvedValueOnce(entity)
        .mockResolvedValueOnce(null);
      typeOrmRepo.save.mockResolvedValue(entity);

      await repository.update('user-1', {
        username: 'newname',
        email: 'new@example.com',
      });

      expect(typeOrmRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: expect.arrayContaining([
          expect.objectContaining({ username: 'newname' }),
          expect.objectContaining({ email: 'new@example.com' }),
        ]),
      });
    });

    it('returns password when shouldOmitPassword=false', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      const result = await repository.update(
        'user-1',
        { firstName: 'Janet' },
        false,
      );

      expect(result.password).toBe('$2b$10$hashedpasswordvaluehere');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repository.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes user, clears cache, and returns omitted user', async () => {
      const entity = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(entity);
      typeOrmRepo.remove.mockResolvedValue(entity);

      const result = await repository.remove('user-1');

      expect(typeOrmRepo.remove).toHaveBeenCalledWith(entity);
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('user-1');
    });
  });

  describe('upsert', () => {
    it('updates existing user found by id', async () => {
      const existing = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const result = await repository.upsert({
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Janet',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      });

      expect(existing.firstName).toBe('Janet');
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });

    it('finds by email when id is missing', async () => {
      const existing = createEntity();
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockResolvedValue(existing);

      await repository.upsert({
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      });

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
    });

    it('does not overwrite password when upsert payload has no password', async () => {
      const existing = createEntity({ password: 'keep-me' });
      typeOrmRepo.findOne.mockResolvedValue(existing);
      typeOrmRepo.save.mockImplementation(async (user) => user);

      const payload = {
        id: 'user-1',
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: undefined as unknown as string | null,
        isActive: true,
        roles: [Role.USER],
      };
      // Simulate falsy password branch: omit password field via destructuring path
      const { password: _p, ...rest } = payload;
      await repository.upsert({ ...rest, password: null });

      // password: null is truthy check fails for null? `if (userData.password)` - null is falsy
      // so it strips password from update data - existing password should remain
      expect(existing.password).toBe('keep-me');
    });

    it('creates a new user when none exists', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      const created = createEntity({ id: 'new-1' });
      typeOrmRepo.create.mockReturnValue(created);
      typeOrmRepo.save.mockResolvedValue(created);

      const userData: IUser = {
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password: null,
        isActive: true,
        roles: [Role.USER],
      };

      const result = await repository.upsert(userData);

      expect(typeOrmRepo.create).toHaveBeenCalledWith({
        ...userData,
        password: null,
      });
      expect(cacheService.delPattern).toHaveBeenCalledWith('users:*');
      expect(result).not.toHaveProperty('password');
    });
  });
});
