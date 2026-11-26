import { OutboxPostgresRepository } from './outbox-postgres.repository';
import { OutboxStatus } from '../entities/outbox-entry.entity';

function makeRepo() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  };
}

function makeEntityManager(repo: ReturnType<typeof makeRepo>) {
  return {
    getRepository: jest.fn().mockReturnValue(repo),
  };
}

function makeQb() {
  const qb: Record<string, jest.Mock> = {};
  qb.delete = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.execute = jest.fn().mockResolvedValue({ affected: 2 });
  return qb;
}

describe('OutboxPostgresRepository', () => {
  let typeormRepo: ReturnType<typeof makeRepo>;
  let outboxRepo: OutboxPostgresRepository;

  beforeEach(() => {
    typeormRepo = makeRepo();
    outboxRepo = new OutboxPostgresRepository(typeormRepo as never);
  });

  describe('save()', () => {
    it('uses the injected repo when no EntityManager provided', async () => {
      await outboxRepo.save({ id: 'x' });
      expect(typeormRepo.save).toHaveBeenCalledWith({ id: 'x' });
    });

    it('uses the EntityManager repo when provided', async () => {
      const emRepo = makeRepo();
      const em = makeEntityManager(emRepo);
      await outboxRepo.save({ id: 'y' }, em as never);
      expect(em.getRepository).toHaveBeenCalled();
      expect(emRepo.save).toHaveBeenCalledWith({ id: 'y' });
    });
  });

  describe('findPending()', () => {
    it('finds entries with PENDING status ordered by createdAt ASC', async () => {
      const entries = [{ id: '1', status: OutboxStatus.PENDING }];
      typeormRepo.find.mockResolvedValue(entries);
      const result = await outboxRepo.findPending();
      expect(typeormRepo.find).toHaveBeenCalledWith({
        where: { status: OutboxStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 100,
      });
      expect(result).toBe(entries);
    });
  });

  describe('update()', () => {
    it('calls repo.update with id and fields', async () => {
      await outboxRepo.update('id1', { status: OutboxStatus.PUBLISHED, publishedAt: new Date('2024-01-01') });
      expect(typeormRepo.update).toHaveBeenCalledWith('id1', {
        status: OutboxStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });
    });
  });

  describe('purgeOldFailed()', () => {
    it('deletes FAILED entries older than cutoff and returns affected count', async () => {
      const qb = makeQb();
      typeormRepo.createQueryBuilder.mockReturnValue(qb);
      const count = await outboxRepo.purgeOldFailed(5000);
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        'status = :status AND "createdAt" < :cutoff',
        expect.objectContaining({ status: OutboxStatus.FAILED }),
      );
      expect(count).toBe(2);
    });

    it('returns 0 when affected is undefined', async () => {
      const qb = makeQb();
      qb.execute.mockResolvedValue({});
      typeormRepo.createQueryBuilder.mockReturnValue(qb);
      expect(await outboxRepo.purgeOldFailed(5000)).toBe(0);
    });
  });
});
