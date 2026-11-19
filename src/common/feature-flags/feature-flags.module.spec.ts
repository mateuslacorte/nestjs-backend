import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FeatureFlagsModule } from './feature-flags.module';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './feature-flag.guard';

const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

@Global()
@Module({
    providers: [{ provide: 'REDIS_CLIENT', useValue: mockRedis }],
    exports: ['REDIS_CLIENT'],
})
class MockRedisModule {}

describe('FeatureFlagsModule', () => {
    it('provides and exports FeatureFlagService and FeatureFlagGuard', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [MockRedisModule, FeatureFlagsModule],
        }).compile();

        expect(moduleRef.get(FeatureFlagService)).toBeInstanceOf(FeatureFlagService);
        expect(moduleRef.get(FeatureFlagGuard)).toBeInstanceOf(FeatureFlagGuard);

        await moduleRef.close();
    });
});
