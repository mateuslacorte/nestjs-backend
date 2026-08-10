import { AUDIT_KEY, Audit } from './audit.decorator';
import { AuditOptions } from '../interfaces/audit.interface';

describe('Audit decorator', () => {
  it('sets audit metadata on the handler', () => {
    const options: AuditOptions = {
      action: 'auth.login',
      category: 'auth',
    };

    class Demo {
      @Audit(options)
      handler() {
        return null;
      }
    }

    expect(Reflect.getMetadata(AUDIT_KEY, Demo.prototype.handler)).toEqual(
      options,
    );
  });
});
