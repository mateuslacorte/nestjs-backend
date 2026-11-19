import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './guards/feature-flag.guard';

@Global()
@Module({
    providers: [FeatureFlagService, FeatureFlagGuard],
    exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
