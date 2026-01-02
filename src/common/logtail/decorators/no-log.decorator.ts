import { SetMetadata } from '@nestjs/common';

export const NO_LOG_KEY = 'noLog';
export const NoLog = () => SetMetadata(NO_LOG_KEY, true);
