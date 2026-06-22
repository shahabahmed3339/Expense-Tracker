import { Prisma } from "@prisma/client";
import superjsonModule from "superjson";

export const superjson = superjsonModule;

superjson.registerCustom<Prisma.Decimal, number>(
  {
    isApplicable: (value): value is Prisma.Decimal => Prisma.Decimal.isDecimal(value),
    serialize: (value) => value.toNumber(),
    deserialize: (value) => new Prisma.Decimal(value),
  },
  "decimal",
);
