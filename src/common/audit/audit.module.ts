import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit, AuditSchema } from './schemas/audit.schema';
import { AuditEntity } from './entities/audit.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditPostgresRepository } from './repositories/postgres.repository';
import { AuditMongoRepository } from './repositories/mongo.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Audit.name, schema: AuditSchema },
        ]),
        TypeOrmModule.forFeature([AuditEntity]),
    ],
    controllers: [AuditController],
    providers: [
        AuditService,
        AuditInterceptor,
        AuditPostgresRepository,
        AuditMongoRepository,
    ],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
