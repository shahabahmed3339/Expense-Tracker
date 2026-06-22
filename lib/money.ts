import { Prisma } from "@prisma/client";

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export function toNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === "number") return value;
  return Number(value);
}

export function sumDecimals(values: Array<Prisma.Decimal | number>): number {
  return values.reduce<number>((acc, value) => acc + toNumber(value), 0);
}
