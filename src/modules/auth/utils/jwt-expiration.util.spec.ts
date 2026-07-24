import { parseDurationToSeconds, withJitter } from './jwt-expiration.util';

describe('parseDurationToSeconds', () => {
  describe('numbers', () => {
    it('floors positive numbers to whole seconds', () => {
      expect(parseDurationToSeconds(60)).toBe(60);
      expect(parseDurationToSeconds(60.9)).toBe(60);
      expect(parseDurationToSeconds(0)).toBe(0);
    });

    it.each([NaN, Infinity, -Infinity, -1])(
      'rejects invalid numeric duration %p',
      (value) => {
        expect(() => parseDurationToSeconds(value)).toThrow(
          `Invalid JWT duration: ${value}`,
        );
      },
    );
  });

  describe('strings', () => {
    it('parses bare numbers as seconds', () => {
      expect(parseDurationToSeconds('60')).toBe(60);
      expect(parseDurationToSeconds(' 120 ')).toBe(120);
    });

    it.each([
      ['1m', 60],
      ['1h', 3600],
      ['1d', 86400],
      ['2S', 2],
      ['3M', 180],
      ['4H', 14400],
      ['5D', 432000],
    ] as const)('parses %s as %i seconds', (input, expected) => {
      expect(parseDurationToSeconds(input)).toBe(expected);
    });

    it('throws for invalid format', () => {
      expect(() => parseDurationToSeconds('abc')).toThrow(
        'Invalid JWT duration format: abc',
      );
      expect(() => parseDurationToSeconds('1x')).toThrow(
        'Invalid JWT duration format: 1x',
      );
      expect(() => parseDurationToSeconds('')).toThrow(
        'Invalid JWT duration format: ',
      );
      expect(() => parseDurationToSeconds('-5s')).toThrow(
        'Invalid JWT duration format: -5s',
      );
    });
  });
});

describe('withJitter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns only the base duration when jitter is zero or negative', () => {
    expect(withJitter(3600, 0)).toBe(3600);
    expect(withJitter('1h', -10)).toBe(3600);
    expect(withJitter('60', NaN)).toBe(60);
  });

  it('adds mocked jitter to the base duration', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(withJitter(100, 20)).toBe(110);
    expect(Math.random).toHaveBeenCalled();
  });

  it('treats max jitter as inclusive', () => {
    jest.spyOn(Math, 'random').mockReturnValue(20 / 21);

    expect(withJitter(100, 20)).toBe(120);
  });

  it('returns base only when random yields zero jitter', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(withJitter('1m', 30)).toBe(60);
  });

  it('floors fractional jitter seconds before applying', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(withJitter(60, 10.9)).toBe(65);
  });
});
