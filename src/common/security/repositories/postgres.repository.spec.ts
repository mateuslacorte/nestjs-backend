import { Repository } from 'typeorm';
import { BlockedIpPostgresRepository } from './postgres.repository';
import { BlockedIpEntity } from '../entities/blocked-ip.entity';
import { IBlockedIp } from '../interfaces/blocked-ip.interface';

type MockRepo = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function createTypeOrmRepo(): MockRepo {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
}

describe('BlockedIpPostgresRepository', () => {
  let typeOrmRepo: MockRepo;
  let repository: BlockedIpPostgresRepository;

  beforeEach(() => {
    typeOrmRepo = createTypeOrmRepo();
    repository = new BlockedIpPostgresRepository(
      typeOrmRepo as unknown as Repository<BlockedIpEntity>,
    );
  });

  describe('findByIp', () => {
    it('queries by ip', async () => {
      const row = { id: '1', ip: '1.1.1.1' };
      typeOrmRepo.findOne.mockResolvedValue(row);

      await expect(repository.findByIp('1.1.1.1')).resolves.toBe(row);
      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { ip: '1.1.1.1' },
      });
    });

    it('returns null when missing', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repository.findByIp('x')).resolves.toBeNull();
    });
  });

  describe('findBlockedByIp', () => {
    it('queries by ip and blocked=true', async () => {
      typeOrmRepo.findOne.mockResolvedValue({ ip: '1.1.1.1', blocked: true });

      await repository.findBlockedByIp('1.1.1.1');

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { ip: '1.1.1.1', blocked: true },
      });
    });
  });

  describe('findBlocked', () => {
    it('lists blocked IPs ordered by blockedAt DESC', async () => {
      const rows = [{ id: '1', blocked: true }];
      typeOrmRepo.find.mockResolvedValue(rows);

      await expect(repository.findBlocked()).resolves.toBe(rows);
      expect(typeOrmRepo.find).toHaveBeenCalledWith({
        where: { blocked: true },
        order: { blockedAt: 'DESC' },
      });
    });
  });

  describe('findSuspicious', () => {
    it('lists unblocked IPs ordered by attempts DESC', async () => {
      const rows = [{ id: '1', blocked: false, attempts: 2 }];
      typeOrmRepo.find.mockResolvedValue(rows);

      await expect(repository.findSuspicious()).resolves.toBe(rows);
      expect(typeOrmRepo.find).toHaveBeenCalledWith({
        where: { blocked: false },
        order: { attempts: 'DESC' },
      });
    });
  });

  describe('create', () => {
    it('creates an entity then saves it', async () => {
      const data: Partial<IBlockedIp> = { id: '1', ip: '8.8.8.8', attempts: 1 };
      const entity = { ...data } as BlockedIpEntity;
      typeOrmRepo.create.mockReturnValue(entity);
      typeOrmRepo.save.mockResolvedValue(entity);

      await expect(repository.create(data)).resolves.toBe(entity);
      expect(typeOrmRepo.create).toHaveBeenCalledWith(data);
      expect(typeOrmRepo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('save', () => {
    it('persists the entity via TypeORM save', async () => {
      const entity = {
        id: '1',
        ip: '1.1.1.1',
        attempts: 2,
        blocked: true,
      } as IBlockedIp;
      typeOrmRepo.save.mockResolvedValue(entity);

      await expect(repository.save(entity)).resolves.toBe(entity);
      expect(typeOrmRepo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('deleteById', () => {
    it('deletes by primary key', async () => {
      typeOrmRepo.delete.mockResolvedValue({ affected: 1 });

      await repository.deleteById('abc');

      expect(typeOrmRepo.delete).toHaveBeenCalledWith('abc');
    });
  });
});
