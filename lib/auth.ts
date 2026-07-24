import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "yigitleromer@gmail.com").toLowerCase();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      return user.email?.toLowerCase() === ADMIN_EMAIL;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email.toLowerCase();
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = String(token.email);
      return session;
    }
  },
  pages: { signIn: "/giris" },
  secret: process.env.NEXTAUTH_SECRET
};

export function isAdminEmail(email?: string | null) {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
