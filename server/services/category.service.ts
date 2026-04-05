import type { PrismaClient } from "@prisma/client";
import { CategoryType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function listCategories(prisma: PrismaClient, userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; type: CategoryType },
) {
  return prisma.category.create({
    data: { userId, name: data.name, type: data.type },
  });
}

export async function updateCategory(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: { name?: string; type?: CategoryType },
) {
  const row = await prisma.category.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  return prisma.category.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.type !== undefined && { type: patch.type }),
    },
  });
}

export async function deleteCategory(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.category.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  return prisma.category.delete({ where: { id } });
}
