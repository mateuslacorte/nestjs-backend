import { OutboxMongoRepository } from './outbox-mongo.repository';
import { OutboxStatus } from '../entities/outbox-entry.entity';

function makeModel() {
  const exec = jest.fn();
  const limit = jest.fn().mockReturnThis();
  const sort = jest.fn().mockReturnThis();
  const find = jest.fn().mockReturnValue({ sort, limit, exec });
  const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn() });
  const deleteMany = jest.fn().mockReturnValue({ exec });
  const create = jest.fn();
  return { find, findByIdAndUpdate, deleteMany, create, exec, limit, sort };
}

describe('OutboxMongoRepository', () => {
  let model: ReturnType<typeof makeModel>;
  let repo: OutboxMongoRepository;

  beforeEach(() => {
    model = makeModel();
    repo = new OutboxMongoRepository(model as never);
  });

  describe('create()', () => {
    it('calls model.create with the doc when no session', async () => {
      model.create.mockResolvedValue({});
      await repo.create({ status: OutboxStatus.PENDING });
      expect(model.create).toHaveBeenCalledWith({ status: OutboxStatus.PENDING });
    });

    it('calls model.create with array and session options when session provided', async () => {
      model.create.mockResolvedValue([{}]);
      const session = {} as never;
      await repo.create({ status: OutboxStatus.PENDING }, session);
      expect(model.create).toHaveBeenCalledWith([{ status: OutboxStatus.PENDING }], { session });
    });
  });

  describe('findPending()', () => {
    it('queries by PENDING status and maps results', async () => {
      model.exec.mockResolvedValue([
        { _id: { toString: () => 'id1' }, eventType: 'user.created', payload: { a: 1 }, retries: 0 },
      ]);
      const results = await repo.findPending();
      expect(model.find).toHaveBeenCalledWith({ status: OutboxStatus.PENDING });
      expect(results).toEqual([{ id: 'id1', eventType: 'user.created', payload: { a: 1 }, retries: 0 }]);
    });
  });

  describe('update()', () => {
    it('calls findByIdAndUpdate with $set', async () => {
      (model.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await repo.update('id1', { status: OutboxStatus.PUBLISHED, publishedAt: new Date('2024-01-01') });
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('id1', {
        $set: { status: OutboxStatus.PUBLISHED, publishedAt: expect.any(Date) },
      });
    });
  });

  describe('purgeOldFailed()', () => {
    it('deletes FAILED entries older than cutoff and returns deletedCount', async () => {
      model.exec.mockResolvedValue({ deletedCount: 3 });
      const count = await repo.purgeOldFailed(1000);
      expect(model.deleteMany).toHaveBeenCalledWith({
        status: OutboxStatus.FAILED,
        createdAt: { $lt: expect.any(Date) },
      });
      expect(count).toBe(3);
    });

    it('returns 0 when deletedCount is undefined', async () => {
      model.exec.mockResolvedValue({});
      expect(await repo.purgeOldFailed(1000)).toBe(0);
    });
  });
});
