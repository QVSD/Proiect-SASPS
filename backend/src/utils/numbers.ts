/**
 * BigInt utility functions
 */

import { randomBytes } from 'crypto';

/**
 * Convert a bigint to a decimal string representation
 *
 * @param value - The bigint value to convert
 * @param scalar - The scalar to divide by (e.g., 10^decimals)
 * @returns Decimal string with trailing zeros trimmed
 *
 * @example
 * bigIntToDecimalString(123456789n, 1000000n) // "123.456789"
 * bigIntToDecimalString(1000000n, 1000000n) // "1"
 */
export function bigIntToDecimalString(value: bigint, scalar: bigint): string {
  const integer = value / scalar;
  const fractional = value % scalar;

  const scalarDigits = scalar.toString().length - 1;
  const fractionalStr = fractional.toString().padStart(scalarDigits, '0');

  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  if (trimmedFractional === '') {
    return integer.toString();
  }

  return `${integer}.${trimmedFractional}`;
}

export function getRandomBigIntBetween(min: bigint, max: bigint): bigint {
  if (max < min) throw new Error('max cannot be less than min');
  if (max === min) return min;

  const range = max - min; // inclusive offset range is [0, range]
  const bits = range.toString(2).length;
  const bytes = (bits + 7) >> 3; // ceil(bits / 8)

  // Mask to keep only the needed bits (reduces rejection rate)
  const excessBits = (bytes << 3) - bits;
  const mask = (1n << BigInt(bits)) - 1n;

  // Largest value < 2^bits that is evenly divisible by (range+1)
  // This enables unbiased modulo reduction with minimal rejection.
  const bound = range + 1n;
  const maxCandidate = mask + 1n - ((mask + 1n) % bound);

  while (true) {
    const buf = randomBytes(bytes);

    // Apply mask to the top byte to drop excess bits without extra BigInt ops
    if (excessBits !== 0) {
      buf[0] &= 0xff >>> excessBits;
    }

    // Convert bytes -> bigint without hex string
    let x = 0n;
    for (let i = 0; i < buf.length; i++) {
      x = (x << 8n) | BigInt(buf[i]);
    }

    // Reject values that would bias modulo
    if (x < maxCandidate) {
      return min + (x % bound);
    }
  }
}
