import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "yigitleromer@gmail.com").toLowerCase();
export const GOOGLE_REFRESH_SKEW_MS = 60_000;

export type TaurusJwt = JWT & {
  googleIdToken?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiresAt?: number;
  googleAuthError?: string;
};

export async function refreshGoogleIdentity(token: TaurusJwt): Promise<TaurusJwt> {
  if (!token.googleRefreshToken) {
    return { ...token, googleAuthError: "GoogleRefreshTokenMissing" };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    return { ...token, googleAuthError: "GoogleOAuthConfigMissing" };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.googleRefreshToken,
      }),
      cache: "no-store",
    });
    const refreshed = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      id_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || refreshed.error) {
      throw new Error(refreshed.error_description || refreshed.error || "Google token refresh failed");
    }

    return {
      ...token,
      googleAccessToken: refreshed.access_token || token.googleAccessToken,
      googleIdToken: refreshed.id_token || token.googleIdToken,
      googleRefreshToken: refreshed.refresh_token || token.googleRefreshToken,
      googleTokenExpiresAt: Date.now() + Math.max(60, Number(refreshed.expires_in || 3600)) * 1000,
      googleAuthError: refreshed.id_token || token.googleIdToken ? undefined : "GoogleIdTokenMissing",
    };
  } catch (error) {
    console.error("Google identity refresh failed", error);
    return { ...token, googleAuthError: "GoogleIdentityRefreshFailed" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      return user.email?.toLowerCase() === ADMIN_EMAIL;
    },
    async jwt({ token, user, account }) {
      const taurusToken = token as TaurusJwt;
      if (user?.email) taurusToken.email = user.email.toLowerCase();

      if (account) {
        taurusToken.googleIdToken = account.id_token || undefined;
        taurusToken.googleAccessToken = account.access_token || undefined;
        taurusToken.googleRefreshToken = account.refresh_token || taurusToken.googleRefreshToken;
        taurusToken.googleTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        taurusToken.googleAuthError = account.id_token ? undefined : "GoogleIdTokenMissing";
        return taurusToken;
      }

      if (
        taurusToken.googleIdToken
        && taurusToken.googleTokenExpiresAt
        && Date.now() < taurusToken.googleTokenExpiresAt - GOOGLE_REFRESH_SKEW_MS
      ) {
        return taurusToken;
      }

      return refreshGoogleIdentity(taurusToken);
    },
    async session({ session, token }) {
      const taurusToken = token as TaurusJwt;
      if (session.user && taurusToken.email) session.user.email = String(taurusToken.email);
      return session;
    },
  },
  pages: { signIn: "/giris" },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isAdminEmail(email?: string | null) {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
