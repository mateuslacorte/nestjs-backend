import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { IBlockedIp } from './interfaces/blocked-ip.interface';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

function createRecord(overrides: Partial<IBlockedIp> = {}): IBlockedIp {
  return {
    id: 'id-1',
    ip: '1.2.3.4',
    attempts: 0,
    blocked: false,
    lastAttemptAt: new Date('2024-01-01T00:00:00.000Z'),
    paths: [],
    ...overrides,
  };
}

describe('SecurityController', () => {
  let securityService: jest.Mocked<
    Pick<
      SecurityService,
      | 'getBlockedIps'
      | 'getSuspiciousIps'
      | 'unblockIp'
      | 'resetAttempts'
      | 'removeIp'
    >
  >;
  let controller: SecurityController;

  beforeEach(() => {
    securityService = {
      getBlockedIps: jest.fn(),
      getSuspiciousIps: jest.fn(),
      unblockIp: jest.fn(),
      resetAttempts: jest.fn(),
      removeIp: jest.fn(),
    };
    controller = new SecurityController(
      securityService as unknown as SecurityService,
    );
  });

  describe('getBlockedIps', () => {
    it('returns blocked IPs from the service', async () => {
      const rows = [createRecord({ blocked: true })];
      securityService.getBlockedIps.mockResolvedValue(rows);

      await expect(controller.getBlockedIps()).resolves.toBe(rows);
      expect(securityService.getBlockedIps).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSuspiciousIps', () => {
    it('returns suspicious IPs from the service', async () => {
      const rows = [createRecord({ attempts: 1 })];
      securityService.getSuspiciousIps.mockResolvedValue(rows);

      await expect(controller.getSuspiciousIps()).resolves.toBe(rows);
      expect(securityService.getSuspiciousIps).toHaveBeenCalledTimes(1);
    });
  });

  describe('unblockIp', () => {
    it('returns a success message with the updated record', async () => {
      const record = createRecord({ blocked: false });
      securityService.unblockIp.mockResolvedValue(record);

      await expect(controller.unblockIp('1.2.3.4')).resolves.toEqual({
        message: 'IP 1.2.3.4 unblocked successfully',
        data: record,
      });
      expect(securityService.unblockIp).toHaveBeenCalledWith('1.2.3.4');
    });
  });

  describe('resetAttempts', () => {
    it('returns a success message with the reset record', async () => {
      const record = createRecord({ attempts: 0 });
      securityService.resetAttempts.mockResolvedValue(record);

      await expect(controller.resetAttempts('8.8.8.8')).resolves.toEqual({
        message: 'Attempts for IP 8.8.8.8 were reset',
        data: record,
      });
      expect(securityService.resetAttempts).toHaveBeenCalledWith('8.8.8.8');
    });
  });

  describe('removeIp', () => {
    it('returns a success message after removal', async () => {
      securityService.removeIp.mockResolvedValue(undefined);

      await expect(controller.removeIp('9.9.9.9')).resolves.toEqual({
        message: 'IP 9.9.9.9 removed from the list successfully',
      });
      expect(securityService.removeIp).toHaveBeenCalledWith('9.9.9.9');
    });
  });
});
