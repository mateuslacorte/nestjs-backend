import { Repository } from 'typeorm';
import { AuditPostgresRepository } from './postgres.repository';
import { AuditEntity } from '../entities/audit.entity';

describe('AuditPostgresRepository', () => {
  let typeOrmRepo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: {
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };
  let repository: AuditPostgresRepository;

  beforeEach(() => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    typeOrmRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    repository = new AuditPostgresRepository(
      typeOrmRepo as unknown as Repository<AuditEntity>,
    );
  });

  it('creates and saves an entity', async () => {
    const data = {
      id: '1',
      ip: '1.1.1.1',
      success: true,
      action: 'auth.login',
      timestamp: new Date(),
    };
    typeOrmRepo.save.mockResolvedValue(data);
    await expect(repository.create(data as never)).resolves.toBe(data);
  });

  it('search applies filters, q, cursor, and ordering', async () => {
    const timestamp = new Date('2026-08-10T00:00:00.000Z');
    await repository.search({
      limit: 11,
      ip: '1.1.1.1',
      success: true,
      action: 'auth.login',
      category: 'auth',
      userId: 'u1',
      provider: 'google',
      q: 'login',
      cursorTimestamp: timestamp,
      cursorId: 'prev',
    });

    expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('a');
    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('a.timestamp', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('a.id', 'DESC');
    expect(qb.take).toHaveBeenCalledWith(11);
    expect(qb.getMany).toHaveBeenCalled();
  });

  it('search works with empty filter', async () => {
    await repository.search({ limit: 50 });
    expect(qb.take).toHaveBeenCalledWith(50);
  });
});
