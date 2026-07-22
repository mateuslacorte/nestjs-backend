const DURATION_REGEX = /^(\d+)([smhd])?$/i;

/**
 * Parses a JWT duration (number of seconds, or strings like "60", "1h", "7d") into seconds.
 */
export function parseDurationToSeconds(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid JWT duration: ${value}`);
    }
    return Math.floor(value);
  }

  const trimmed = value.trim();
  const match = DURATION_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid JWT duration format: ${value}`);
  }

  const amount = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      throw new Error(`Invalid JWT duration unit: ${unit}`);
  }
}

/**
 * Returns base TTL in seconds plus a random jitter in [0, jitterSeconds].
 * If jitterSeconds <= 0, returns only the base duration.
 */
export function withJitter(
  base: string | number,
  jitterSeconds: number,
): number {
  const baseSeconds = parseDurationToSeconds(base);
  const maxJitter = Math.max(0, Math.floor(jitterSeconds || 0));
  if (maxJitter === 0) {
    return baseSeconds;
  }
  const jitter = Math.floor(Math.random() * (maxJitter + 1));
  return baseSeconds + jitter;
}
