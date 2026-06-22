import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/server/db/client";

const googleId = process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_SECRET;
const MAX_SESSION_IMAGE_LENGTH = 1024;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(googleId && googleSecret
      ? [
          GoogleProvider({
            clientId: googleId,
            clientSecret: googleSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        challengeId: { label: "Challenge", type: "text" },
        otpCode: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        if (user.otpEnabled) {
          const challengeId = credentials?.challengeId;
          const otpCode = credentials?.otpCode?.trim();
          if (!challengeId || !otpCode) return null;

          const challenge = await prisma.loginOtpChallenge.findFirst({
            where: {
              id: challengeId,
              userId: user.id,
              email,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
          });
          if (!challenge) return null;

          const otpOk = await compare(otpCode, challenge.codeHash);
          if (!otpOk) return null;

          await prisma.loginOtpChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) token.id = user.id;
      if (trigger === "update" && session?.name !== undefined) {
        token.name = session.name;
      }
      if (trigger === "update" && session?.email !== undefined) {
        token.email = session.email;
      }
      if (user?.name !== undefined) {
        token.name = user.name;
      }
      if (user?.email !== undefined) {
        token.email = user.email;
      }
      if (trigger === "update" && session?.image !== undefined) {
        token.picture = shouldStoreImageInToken(session.image) ? session.image : undefined;
      } else if (user?.image !== undefined) {
        token.picture = shouldStoreImageInToken(user.image) ? user.image : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.email ?? "";
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;
      }
      return session;
    },
  },
};

function shouldStoreImageInToken(image: string | null | undefined) {
  return !!image && image.length <= MAX_SESSION_IMAGE_LENGTH;
}
