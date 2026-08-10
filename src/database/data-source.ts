import { DataSource } from 'typeorm';
import databaseConfig from '../config/database.config';
import { UserEntity } from '../modules/users/entities/user.entity';
import { AuditEntity } from '../common/audit/entities/audit.entity';
import { BlockedIpEntity } from '../common/security/entities/blocked-ip.entity';

const { postgres } = databaseConfig();

export default new DataSource({
    ...postgres,
    entities: [UserEntity, AuditEntity, BlockedIpEntity],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
});
