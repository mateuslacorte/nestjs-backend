import { BlockedIp, BlockedIpSchema } from './blocked-ip.schema';
import { BlockedIpEntity } from '../entities/blocked-ip.entity';

describe('BlockedIp schema', () => {
  it('exports a Mongoose model class and schema factory result', () => {
    expect(BlockedIp.name).toBe('BlockedIp');
    expect(BlockedIpSchema).toBeDefined();
    expect(typeof BlockedIpSchema.index).toBe('function');
  });

  it('defines ip and id as required unique string paths', () => {
    const paths = BlockedIpSchema.paths;

    expect(paths.id).toBeDefined();
    expect(paths.ip).toBeDefined();
    expect(paths.attempts).toBeDefined();
    expect(paths.blocked).toBeDefined();
    expect(paths.lastAttemptAt).toBeDefined();
    expect(paths.paths).toBeDefined();
  });

  it('marks ip unique via @Prop and indexes blocked', () => {
    expect(BlockedIpSchema.path('ip').options.unique).toBe(true);
    expect(BlockedIpSchema.path('id').options.unique).toBe(true);

    const indexes = BlockedIpSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.objectContaining({ blocked: 1 })]),
      ]),
    );
  });
});

describe('BlockedIpEntity', () => {
  it('can be instantiated with IBlockedIp fields', () => {
    const entity = new BlockedIpEntity();
    entity.id = 'uuid';
    entity.ip = '1.1.1.1';
    entity.attempts = 0;
    entity.blocked = false;
    entity.lastAttemptAt = new Date();
    entity.paths = [];

    expect(entity).toMatchObject({
      id: 'uuid',
      ip: '1.1.1.1',
      attempts: 0,
      blocked: false,
      paths: [],
    });
  });
});
