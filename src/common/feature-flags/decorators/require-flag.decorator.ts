import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

export const RequireFlag = (flag: string) => SetMetadata(FEATURE_FLAG_KEY, flag);
