import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Admin authentication.
 *
 * next-auth v4 dropped the v3 `Adapters.Prisma` API and its adapter requires a
 * different table layout. Admin access is limited to a small allowlist of
 * Google accounts, so sessions are stored in a signed JWT cookie instead of the
 * database. Requires NEXTAUTH_SECRET to be set in production.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',');

      if (!authorizedEmails) {
        return true;
      }

      // v4 uses Google's OIDC profile, which exposes `email_verified`
      // (v3 used the legacy userinfo endpoint's `verified_email`).
      const googleProfile = profile as
        | { email?: string; email_verified?: boolean }
        | undefined;

      return (
        account?.provider === 'google' &&
        googleProfile?.email_verified === true &&
        authorizedEmails.includes(googleProfile.email as string)
      );
    },
  },
};
