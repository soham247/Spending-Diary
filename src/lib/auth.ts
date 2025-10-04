import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: {
          label: "Phone",
          type: "text",
          placeholder: "98xxxxxxx10",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Your password",
        },
      },

      async authorize(credentials) {
        const { phone, password } = credentials ?? {};
        if (!phone || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            phone,
          },
        });
        if (!user) {
          throw new Error("User not found");
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          throw new Error("Invalid password");
        }

        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            isPremium: user.isPremium,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.id = user.id;
            token.isPremium = user.isPremium;
        }
        return token;
    },
    async session({ session, token }) {
        if (token) {
            session.user.id = token.id as string;
            session.user.isPremium = token.isPremium as boolean;
        }
        return session;
    },
  }
};
