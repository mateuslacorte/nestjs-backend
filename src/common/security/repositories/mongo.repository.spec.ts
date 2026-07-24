import { Model } from 'mongoose';
import { BlockedIpMongoRepository } from './mongo.repository';
import { BlockedIp } from '../schemas/blocked-ip.schema';
import { IBlockedIp } from '../interfaces/blocked-ip.interface';

type LeanQuery = {
  lean: jest.Mock;
  sort: jest.Mock;
};

type MockModel = jest.Mock & {
  findOne: jest.Mock;
  find: jest.Mock;
  findOneAndUpdate: jest.Mock;
  deleteOne: jest.Mock;
};

function createLeanChain(result: unknown): LeanQuery {
  const lean = jest.fn().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ lean });
  return { lean, sort };
}

describe('BlockedIpMongoRepository', () => {
  let model: MockModel;
  let repository: BlockedIpMongoRepository;
  let docInstance: {
    save: jest.Mock;
    toObject: jest.Mock;
  };

  beforeEach(() => {
    docInstance = {
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({ id: '1', ip: '1.1.1.1' }),
    };

    model = Object.assign(
      jest.fn().mockImplementation(() => docInstance),
      {
        findOne: jest.fn(),
        find: jest.fn(),
        findOneAndUpdate: jest.fn().mockResolvedValue(null),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      },
    ) as MockModel;

    repository = new BlockedIpMongoRepository(
      model as unknown as Model<BlockedIp>,
    );
  });

  describe('findByIp', () => {
    it('returns the lean document when found', async () => {
      const chain = createLeanChain({ id: '1', ip: '1.1.1.1' });
      model.findOne.mockReturnValue(chain);

      await expect(repository.findByIp('1.1.1.1')).resolves.toEqual({
        id: '1',
        ip: '1.1.1.1',
      });
      expect(model.findOne).toHaveBeenCalledWith({ ip: '1.1.1.1' });
      expect(chain.lean).toHaveBeenCalled();
    });

    it('returns null when not found', async () => {
      const chain = createLeanChain(null);
      model.findOne.mockReturnValue(chain);

      await expect(repository.findByIp('missing')).resolves.toBeNull();
    });
  });

  describe('findBlocked', () => {
    it('queries blocked docs sorted by blockedAt desc', async () => {
      const docs = [{ id: '1', blocked: true }];
      const chain = createLeanChain(docs);
      model.find.mockReturnValue(chain);

      await expect(repository.findBlocked()).resolves.toEqual(docs);
      expect(model.find).toHaveBeenCalledWith({ blocked: true });
      expect(chain.sort).toHaveBeenCalledWith({ blockedAt: -1 });
    });
  });

  describe('findSuspicious', () => {
    it('queries unblocked docs sorted by attempts desc', async () => {
      const docs = [{ id: '1', blocked: false, attempts: 3 }];
      const chain = createLeanChain(docs);
      model.find.mockReturnValue(chain);

      await expect(repository.findSuspicious()).resolves.toEqual(docs);
      expect(model.find).toHaveBeenCalledWith({ blocked: false });
      expect(chain.sort).toHaveBeenCalledWith({ attempts: -1 });
    });
  });

  describe('create', () => {
    it('constructs, saves, and returns toObject()', async () => {
      const data: Partial<IBlockedIp> = {
        id: '1',
        ip: '8.8.8.8',
        attempts: 1,
      };

      const result = await repository.create(data);

      expect(model).toHaveBeenCalledWith(data);
      expect(docInstance.save).toHaveBeenCalled();
      expect(docInstance.toObject).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', ip: '1.1.1.1' });
    });
  });

  describe('updateById', () => {
    it('applies $set only when no path is pushed', async () => {
      await repository.updateById('id-1', { attempts: 2 });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'id-1' },
        { $set: { attempts: 2 } },
      );
    });

    it('adds $push with $slice when path and maxPathsStored are provided', async () => {
      await repository.updateById('id-1', { attempts: 3 }, '/new', 20);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'id-1' },
        {
          $set: { attempts: 3 },
          $push: {
            paths: {
              $each: ['/new'],
              $slice: -20,
            },
          },
        },
      );
    });

    it('does not $push when path is provided without maxPathsStored', async () => {
      await repository.updateById('id-1', { blocked: true }, '/x');

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'id-1' },
        { $set: { blocked: true } },
      );
    });

    it('does not $push when maxPathsStored is provided without path', async () => {
      await repository.updateById('id-1', { blocked: true }, undefined, 20);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'id-1' },
        { $set: { blocked: true } },
      );
    });
  });

  describe('deleteById', () => {
    it('deletes by id field', async () => {
      await repository.deleteById('id-9');
      expect(model.deleteOne).toHaveBeenCalledWith({ id: 'id-9' });
    });
  });
});
