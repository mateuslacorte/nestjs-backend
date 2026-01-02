import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

// Schemas
import { BlockedIp, BlockedIpSchema } from './schemas/blocked-ip.schema';

// Entities
import { BlockedIpEntity } from './entities/blocked-ip.entity';

// Service & Controllers
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { CatchAllController } from './catchall.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: BlockedIp.name, schema: BlockedIpSchema },
        ]),
        TypeOrmModule.forFeature([BlockedIpEntity]),
    ],
    controllers: [SecurityController, CatchAllController],
    providers: [SecurityService],
    exports: [SecurityService],
})
export class SecurityModule {}
