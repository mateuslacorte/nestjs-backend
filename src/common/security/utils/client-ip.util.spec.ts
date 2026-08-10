import { AppRequest } from '@common/http/app-http';
import { getClientIp, getClientPort } from './client-ip.util';

describe('getClientIp', () => {
  it('prefers CF-Connecting-IP over req.ip and other headers', () => {
    expect(
      getClientIp({
        ip: '10.0.0.1',
        headers: {
          'cf-connecting-ip': '203.0.113.10',
          'x-forwarded-for': '9.9.9.9',
        },
      } as unknown as AppRequest),
    ).toBe('203.0.113.10');
  });

  it('prefers True-Client-IP when CF-Connecting-IP is absent', () => {
    expect(
      getClientIp({
        ip: '10.0.0.1',
        headers: { 'true-client-ip': '198.51.100.20' },
      } as unknown as AppRequest),
    ).toBe('198.51.100.20');
  });

  it('prefers req.ip when Cloudflare headers are absent', () => {
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

    expect(getClientIp({ headers: {} } as unknown as AppRequest)).toBe(
      'unknown',
    );
  });
});

describe('getClientPort', () => {
  it('prefers x-forwarded-port when valid', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': '8443' },
        socket: { remotePort: 1234 },
      } as unknown as AppRequest),
    ).toBe(8443);
  });

  it('accepts x-forwarded-port as array', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': ['443', '80'] },
      } as unknown as AppRequest),
    ).toBe(443);
  });

  it('uses first hop from comma-separated x-forwarded-port', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': '8080, 443' },
      } as unknown as AppRequest),
    ).toBe(8080);
  });

  it('ignores invalid x-forwarded-port and uses socket.remotePort', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': 'not-a-port' },
        socket: { remotePort: 3210 },
      } as unknown as AppRequest),
    ).toBe(3210);
  });

  it('ignores empty x-forwarded-port and uses socket.remotePort', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': '  , 443' },
        socket: { remotePort: 3210 },
      } as unknown as AppRequest),
    ).toBe(3210);
  });

  it('ignores out-of-range x-forwarded-port and uses socket.remotePort', () => {
    expect(
      getClientPort({
        headers: { 'x-forwarded-port': '99999' },
        socket: { remotePort: 3210 },
      } as unknown as AppRequest),
    ).toBe(3210);
  });

  it('uses cf-client-port when CF-Device-Accept-CH is configured', () => {
    expect(
      getClientPort({
        headers: {
          'cf-device-accept-ch': 'Sec-CH-UA-Model',
          'cf-client-port': '4443',
        },
      } as unknown as AppRequest),
    ).toBe(4443);
  });

  it('uses x-client-port when CF-Device-Accept-CH is set', () => {
    expect(
      getClientPort({
        headers: {
          'cf-device-accept-ch': 'Sec-CH-UA-Model',
          'x-client-port': '9000',
        },
      } as unknown as AppRequest),
    ).toBe(9000);
  });

  it('uses client-port when CF-Device-Accept-CH is set', () => {
    expect(
      getClientPort({
        headers: {
          'cf-device-accept-ch': 'Sec-CH-UA-Model',
          'client-port': '9001',
        },
      } as unknown as AppRequest),
    ).toBe(9001);
  });

  it('ignores blank CF-Connecting-IP and continues', () => {
    expect(
      getClientIp({
        ip: '10.0.0.1',
        headers: { 'cf-connecting-ip': '   ' },
      } as unknown as AppRequest),
    ).toBe('10.0.0.1');
  });

  it('returns null when no port is available', () => {
    expect(
      getClientPort({ headers: {} } as unknown as AppRequest),
    ).toBeNull();
  });
});
