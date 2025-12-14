/**
 * BigInt utility functions
 */

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
