import assert from './assert';

export function coerceNumericToBigInt(
  value: number | bigint,
  valueName: string,
): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  assert(
    Number.isSafeInteger(value),
    `${valueName ?? 'Value'} must be a safe integer or bigint`,
  );
  return BigInt(value);
}

export function coerceOptionalNumericToBigInt(
  value: number | bigint | null | undefined,
  valueName: string,
): bigint | undefined {
  return value == null ? undefined : coerceNumericToBigInt(value, valueName);
}

export function coerceNullableNumericToBigInt(
  value: number | bigint | null,
  valueName: string,
): bigint | null {
  return value == null ? null : coerceNumericToBigInt(value, valueName);
}
