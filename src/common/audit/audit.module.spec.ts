import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuditModule } from './audit.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditPostgresRepository } from './repositories/postgres.repository';
import { AuditMongoRepository } from './repositories/mongo.repository';

describe('AuditModule', () => {
  it('registers controller, providers, and exports AuditService', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AuditModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AuditModule,
    ) as Array<{ name?: string } | (new (...args: never[]) => unknown)>;
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AuditModule,
    ) as unknown[];

    expect(controllers.map((c) => (c as { name: string }).name)).toEqual(
      expect.arrayContaining([AuditController.name]),
    );
    expect(
      providers.map((p) =>
        typeof p === 'function' ? p.name : (p as { name?: string }).name,
      ),
    ).toEqual(
      expect.arrayContaining([
        AuditService.name,
        AuditInterceptor.name,
        AuditPostgresRepository.name,
        AuditMongoRepository.name,
      ]),
    );
    expect(exportsMeta.map((e) => (e as { name: string }).name)).toEqual(
      expect.arrayContaining([AuditService.name]),
    );
  });
});
