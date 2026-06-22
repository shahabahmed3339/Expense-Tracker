import type { PrismaClient } from "@prisma/client";
import { CategoryType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

async function ensureUniqueCategoryName(
  prisma: PrismaClient,
  userId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: { equals: name.trim(), mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A category with this name already exists",
    });
  }
}

export async function listCategories(prisma: PrismaClient, userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function createCategory(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; type: CategoryType },
) {
  const name = data.name.trim();
  await ensureUniqueCategoryName(prisma, userId, name);

  return prisma.category.create({
    data: { userId, name, type: data.type },
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

  if (patch.name !== undefined) {
    await ensureUniqueCategoryName(prisma, userId, patch.name, id);
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.type !== undefined && { type: patch.type }),
    },
  });
}

export async function deleteCategory(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.category.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });

  const [expenseCount, budgetCount] = await Promise.all([
    prisma.expense.count({ where: { categoryId: id, userId } }),
    prisma.budget.count({ where: { categoryId: id, userId } }),
  ]);

  if (expenseCount > 0 || budgetCount > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Cannot delete category with linked expenses or budgets",
    });
  }

  return prisma.category.delete({ where: { id } });
}
