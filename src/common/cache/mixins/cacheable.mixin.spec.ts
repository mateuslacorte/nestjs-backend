import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CacheService } from '../cache.service';
import { CacheableRepository } from './cacheable.mixin';

@Injectable()
class BaseRepo {
  value = 'base';
}

const MixedRepo = CacheableRepository(BaseRepo);

describe('CacheableRepository mixin', () => {
  it('injects optional CacheService when provided', async () => {
    const redis = {
      ping: jest.fn(),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      keys: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MixedRepo,
        CacheService,
        { provide: 'REDIS_CLIENT', useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(3600),
          },
        },
      ],
    }).compile();

    const instance = moduleRef.get(MixedRepo);
    expect(instance).toBeInstanceOf(MixedRepo);
    expect(instance.value).toBe('base');
    expect(instance.cacheService).toBeInstanceOf(CacheService);

    await moduleRef.close();
  });

  it('leaves cacheService undefined when CacheService is not provided', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MixedRepo],
    }).compile();

    const instance = moduleRef.get(MixedRepo);
    expect(instance.cacheService).toBeUndefined();

    await moduleRef.close();
  });
});
