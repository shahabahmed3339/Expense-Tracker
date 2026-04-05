import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

async function ensureUniquePersonName(
  prisma: PrismaClient,
  userId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.person.findFirst({
    where: {
      userId,
      name: { equals: name.trim(), mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A person with this name already exists",
    });
  }
}

export async function listPeople(prisma: PrismaClient, userId: string) {
  return prisma.person.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; contact?: string | null },
) {
  const name = data.name.trim();
  await ensureUniquePersonName(prisma, userId, name);

  return prisma.person.create({
    data: {
      userId,
      name,
      contact: data.contact ?? undefined,
    },
  });
}

export async function updatePerson(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: { name?: string; contact?: string | null },
) {
  const row = await prisma.person.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });

  if (patch.name !== undefined) {
    await ensureUniquePersonName(prisma, userId, patch.name, id);
  }

  return prisma.person.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.contact !== undefined && { contact: patch.contact }),
    },
  });
}

export async function deletePerson(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.person.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
  return prisma.person.delete({ where: { id } });
}
