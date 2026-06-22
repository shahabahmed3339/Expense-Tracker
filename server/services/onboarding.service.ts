import type { PrismaClient } from "@prisma/client";
import { CategoryType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

const DEFAULT_CATEGORIES: Array<{ name: string; type: CategoryType }> = [
  { name: "Food & Dining", type: CategoryType.VARIABLE },
  { name: "Transport", type: CategoryType.VARIABLE },
  { name: "Housing", type: CategoryType.FIXED },
  { name: "Utilities", type: CategoryType.FIXED },
  { name: "Entertainment", type: CategoryType.VARIABLE },
  { name: "Healthcare", type: CategoryType.VARIABLE },
  { name: "Shopping", type: CategoryType.VARIABLE },
  { name: "Income", type: CategoryType.FIXED },
];

export async function getOnboardingStatus(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true, defaultCurrency: true, locale: true },
  });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  return user;
}

export async function completeOnboarding(
  prisma: PrismaClient,
  userId: string,
  data: { name?: string; defaultCurrency?: string; locale?: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  if (!user.onboardingCompleted) {
    const existingCategories = await prisma.category.count({ where: { userId } });
    if (existingCategories === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          userId,
          name: category.name,
          type: category.type,
        })),
      });
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      ...(data.name !== undefined && { name: data.name.trim() || null }),
      ...(data.defaultCurrency !== undefined && { defaultCurrency: data.defaultCurrency }),
      ...(data.locale !== undefined && { locale: data.locale }),
    },
    select: {
      id: true,
      name: true,
      onboardingCompleted: true,
      defaultCurrency: true,
      locale: true,
    },
  });
}
