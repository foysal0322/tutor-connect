import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/student-signin", // default sign-in page, but we have multiple
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or NSU ID", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Only fetch required fields — never load the full user row
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.identifier },
              { nsuId: credentials.identifier }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            nsuId: true,
            role: true,
            password: true,
            isBlocked: true,
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        // In a Unified Campus System, we allow any non-admin user (STUDENT or TUTOR) to sign in seamlessly
        if (credentials.role === 'ADMIN' && user.role !== 'ADMIN') {
          throw new Error("Access denied. Admin privileges required.");
        }

        if (user.isBlocked) {
          throw new Error("Your account has been blocked by an administrator.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'STUDENT' | 'TUTOR' | 'ADMIN',
          nsuId: user.nsuId,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.nsuId = (user as any).nsuId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).nsuId = token.nsuId;
      }
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token.tutor-connect`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url.tutor-connect`,
      options: {
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token.tutor-connect`,
      options: {
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
