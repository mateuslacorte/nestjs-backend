import { AuditEntity } from './audit.entity';
import { Audit, AuditSchema } from '../schemas/audit.schema';

describe('AuditEntity', () => {
  it('can be constructed', () => {
    const entity = new AuditEntity();
    entity.id = '1';
    entity.action = 'auth.login';
    entity.ip = '1.1.1.1';
    entity.port = 443;
    entity.success = true;
    entity.timestamp = new Date('2026-08-10T12:00:00.000Z');
    expect(entity.action).toBe('auth.login');
    expect(entity.timestamp.toISOString()).toBe('2026-08-10T12:00:00.000Z');
  });
});

describe('Audit schema', () => {
  it('exposes model class and schema', () => {
    expect(Audit.name).toBe('Audit');
    expect(AuditSchema).toBeDefined();
  });
});
