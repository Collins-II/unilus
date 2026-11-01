import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import User from "@/lib/database/models/User";
import { connectToDatabase } from "@/lib/database";
import { logApiError } from "@/lib/database/errors";
import { clientIp, rateLimit, RateLimitError } from "@/lib/rate-limit";
import { STUDENT_SESSION_COOKIE, STUDENT_SESSION_MAX_AGE } from "@/lib/session-cookie";

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET is required in production. Set it in the deployment environment before starting the app.");
}

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Compared against when the student ID is unknown so response timing does not reveal which IDs exist.
const DUMMY_HASH = "$2b$12$ZxdR80E1u2s/QNXwFRmziu0ZqBOkjoM/Zo/MqlreguSoHUZ9YhgG.";

export const AUTH_ERRORS = {
  locked: "This account is temporarily locked after too many failed attempts. Try again in 15 minutes.",
  rateLimited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  unavailable: "Authentication is temporarily unavailable.",
} as const;

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  cookies: {
    sessionToken: {
      name: STUDENT_SESSION_COOKIE,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: STUDENT_SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: STUDENT_SESSION_MAX_AGE,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        studentId: { label: "Student ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const studentId = String(credentials?.studentId ?? "").trim().toUpperCase();
        const password = String(credentials?.password ?? "");
        if (!studentId || !password || studentId.length > 32 || password.length > 200) return null;

        try {
          rateLimit(`login:ip:${clientIp(req?.headers)}`, 20, 15 * 60_000);
          rateLimit(`login:id:${studentId}`, 10, 15 * 60_000);
        } catch (error) {
          if (error instanceof RateLimitError) throw new Error(AUTH_ERRORS.rateLimited);
          throw error;
        }

        let user;
        try {
          await connectToDatabase();
          user = await User.findOne({ studentId }).select("+password +failedLogins +lockedUntil");
        } catch (error) {
          logApiError(error, "auth.credentials");
          throw new Error(AUTH_ERRORS.unavailable);
        }

        if (!user || !user.password || user.status !== "active" || user.role !== "student") {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) throw new Error(AUTH_ERRORS.locked);

        try {
          const isLegacyPassword = !user.password.startsWith("$2");
          const isValidPassword = isLegacyPassword ? password === user.password : await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            user.failedLogins = (user.failedLogins ?? 0) + 1;
            if (user.failedLogins >= MAX_FAILED_LOGINS) {
              user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
              user.failedLogins = 0;
            }
            await user.save();
            return null;
          }

          if (isLegacyPassword) user.password = await bcrypt.hash(password, 12);
          user.failedLogins = 0;
          user.lockedUntil = undefined;
          await user.save();

          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            studentId: user.studentId,
            role: user.role,
          };
        } catch (error) {
          logApiError(error, "auth.credentials");
          throw new Error(AUTH_ERRORS.unavailable);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.studentId = (user as { studentId?: string }).studentId ?? token.sub ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "student";
        session.user.studentId = (token.studentId as string | undefined) ?? "";
      }
      return session;
    },
  },
};

