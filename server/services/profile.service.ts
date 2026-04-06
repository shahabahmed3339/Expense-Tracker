import type { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { getPasswordValidationMessage } from "@/lib/auth/password";
import { sanitizeProfileImage } from "@/lib/profile/image";
import { buildVerificationEmail, sendEmail } from "@/server/auth/email";
import { addHours, generateVerificationToken } from "@/server/auth/tokens";

export async function getProfile(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      otpEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  return user;
}

export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; email: string; image: string | null },
) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!currentUser) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email is required" });
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      id: { not: userId },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
  }

  let image: string | null;
  try {
    image = sanitizeProfileImage(data.image);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid profile image",
    });
  }

  const emailChanged = normalizedEmail !== currentUser.email;
  const verificationBaseUrl = process.env.NEXTAUTH_URL;

  if (emailChanged && !verificationBaseUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "NEXTAUTH_URL must be configured before changing email addresses",
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name.trim() || null,
        email: normalizedEmail,
        image,
        ...(emailChanged ? { emailVerified: null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        otpEnabled: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!emailChanged) {
      return { updatedUser, verificationToken: null as string | null };
    }

    await tx.emailVerificationToken.deleteMany({
      where: {
        userId,
        consumedAt: null,
      },
    });

    const verificationToken = generateVerificationToken();
    await tx.emailVerificationToken.create({
      data: {
        userId,
        email: normalizedEmail,
        token: verificationToken,
        expiresAt: addHours(new Date(), 24),
      },
    });

    return { updatedUser, verificationToken };
  });

  if (emailChanged && result.verificationToken && verificationBaseUrl) {
    const verificationUrl = `${verificationBaseUrl}/verify-email?token=${result.verificationToken}`;
    await sendEmail({
      to: normalizedEmail,
      ...buildVerificationEmail(result.updatedUser.name ?? currentUser.name, verificationUrl),
    });
  }

  return {
    ...result.updatedUser,
    verificationRequired: emailChanged,
  };
}

export async function changePassword(
  prisma: PrismaClient,
  userId: string,
  data: { currentPassword: string; newPassword: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Password login is not available for this account" });
  }

  const currentMatches = await compare(data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
  }

  const passwordError = getPasswordValidationMessage(data.newPassword);
  if (passwordError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
  }

  const passwordHash = await hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { ok: true };
}

export async function setOtpEnabled(prisma: PrismaClient, userId: string, enabled: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { otpEnabled: enabled },
  });

  return { ok: true };
}

export async function deleteAccount(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  if (user.passwordHash) {
    if (!currentPassword) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is required" });
    }
    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
