import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Admin authentication.
 *
 * Admin access is limited to a small allowlist of Google accounts, so sessions
 * are stored in a signed JWT cookie and no database adapter is needed.
 * Requires NEXTAUTH_SECRET to be set in production.
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
      // Blank means "allow any account the Google OAuth app allows" (see .env.example).
      // Entries are compared trimmed and case-insensitively.
      const authorizedEmails = (process.env.AUTHORIZED_EMAILS ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      if (!authorizedEmails.length) {
        return true;
      }

      // Google's OIDC profile exposes verification as `email_verified`
      const googleProfile = profile as
        | { email?: string; email_verified?: boolean }
        | undefined;

      return (
        account?.provider === 'google' &&
        googleProfile?.email_verified === true &&
        !!googleProfile.email &&
        authorizedEmails.includes(googleProfile.email.toLowerCase())
      );
    },
  },
};
