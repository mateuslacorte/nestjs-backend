import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockedIp, BlockedIpSchema } from './schemas/blocked-ip.schema';
import { BlockedIpEntity } from './entities/blocked-ip.entity';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { CatchAllController } from './catchall.controller';
import { BlockedIpPostgresRepository } from './repositories/postgres.repository';
import { BlockedIpMongoRepository } from './repositories/mongo.repository';
import { WikiModule } from '../../wiki/wiki.module';

const CATCH_ALL_ENVIRONMENTS = new Set(['production', 'staging']);

const isCatchAllEnabled = CATCH_ALL_ENVIRONMENTS.has(
    process.env.NODE_ENV || 'development',
);

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: BlockedIp.name, schema: BlockedIpSchema },
        ]),
        TypeOrmModule.forFeature([BlockedIpEntity]),
        ...(isCatchAllEnabled ? [WikiModule] : []),
    ],
    controllers: [
        SecurityController,
        ...(isCatchAllEnabled ? [CatchAllController] : []),
    ],
    providers: [
        SecurityService,
        BlockedIpPostgresRepository,
        BlockedIpMongoRepository,
    ],
    exports: [SecurityService],
})
export class SecurityModule {}
