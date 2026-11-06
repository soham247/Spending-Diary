export function toSafeNumber(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new RangeError("Money exceeds the safe integer range");
  return number;
}
