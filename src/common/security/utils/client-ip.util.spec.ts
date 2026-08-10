import { AppRequest } from '@common/http/app-http';
import { getClientIp } from './client-ip.util';

describe('getClientIp', () => {
  it('prefers req.ip when present', () => {
    expect(
      getClientIp({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '9.9.9.9' },
      } as unknown as AppRequest),
    ).toBe('10.0.0.1');
  });

  it('uses first x-forwarded-for hop when req.ip is missing', () => {
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
      } as unknown as AppRequest),
    ).toBe('1.1.1.1');
  });

  it('accepts x-forwarded-for as a string array', () => {
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': ['3.3.3.3', '4.4.4.4'] },
      } as unknown as AppRequest),
    ).toBe('3.3.3.3');
  });

  it('uses x-real-ip when forwarded is missing', () => {
    expect(
      getClientIp({
        headers: { 'x-real-ip': '8.8.8.8' },
      } as unknown as AppRequest),
    ).toBe('8.8.8.8');
  });

  it('accepts x-real-ip as a string array', () => {
    expect(
      getClientIp({
        headers: { 'x-real-ip': ['7.7.7.7'] },
      } as unknown as AppRequest),
    ).toBe('7.7.7.7');
  });

  it('falls back to socket remoteAddress then unknown', () => {
    expect(
      getClientIp({
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as AppRequest),
    ).toBe('127.0.0.1');

    expect(getClientIp({ headers: {} } as unknown as AppRequest)).toBe('unknown');
  });
});
