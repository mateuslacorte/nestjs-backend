import { Model } from 'mongoose';
import { AuditMongoRepository } from './mongo.repository';
import { Audit } from '../schemas/audit.schema';

describe('AuditMongoRepository', () => {
  let save: jest.Mock;
  let toObject: jest.Mock;
  let findChain: {
    sort: jest.Mock;
    limit: jest.Mock;
    lean: jest.Mock;
  };
  let find: jest.Mock;
  let ModelCtor: jest.Mock;
  let repository: AuditMongoRepository;

  beforeEach(() => {
    save = jest.fn().mockResolvedValue(undefined);
    toObject = jest.fn().mockReturnValue({ id: 'm1' });
    findChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ id: 'm1' }]),
    };
    find = jest.fn().mockReturnValue(findChain);
    ModelCtor = jest.fn().mockImplementation(() => ({
      save,
      toObject,
    }));
    (ModelCtor as unknown as { find: jest.Mock }).find = find;

    repository = new AuditMongoRepository(
      ModelCtor as unknown as Model<Audit>,
    );
  });

  it('creates a document', async () => {
    await expect(
      repository.create({
        id: 'm1',
        ip: '1.1.1.1',
        port: null,
        success: true,
        action: 'auth.register',
        timestamp: new Date(),
      }),
    ).resolves.toEqual({ id: 'm1' });
  });

  it('search queries with filters, q, and cursor', async () => {
    const timestamp = new Date('2026-08-10T00:00:00.000Z');
    await repository.search({
      limit: 5,
      ip: '2.2.2.2',
      success: false,
      action: 'auth.refresh',
      category: 'auth',
      userId: 'u1',
      provider: 'google',
      q: 'fail',
      cursorTimestamp: timestamp,
      cursorId: 'prev',
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '2.2.2.2',
        success: false,
        action: 'auth.refresh',
        category: 'auth',
        userId: 'u1',
        provider: 'google',
        $and: expect.any(Array),
      }),
    );
    expect(findChain.sort).toHaveBeenCalledWith({ timestamp: -1, id: -1 });
    expect(findChain.limit).toHaveBeenCalledWith(5);
  });

  it('search defaults when no filters', async () => {
    await repository.search({ limit: 50 });
    expect(find).toHaveBeenCalledWith({});
    expect(findChain.limit).toHaveBeenCalledWith(50);
  });
});
