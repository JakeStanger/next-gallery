import NextAuth, { NextAuthOptions } from 'next-auth';
import Providers from 'next-auth/providers';
import Adapters from 'next-auth/adapters';
import prisma from '../../../lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

const options: NextAuthOptions = {
  adapter: Adapters.Prisma.Adapter({ prisma }),
  providers: [
    Providers.Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn: async (_user, account, profile) => {
      const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',');

      if (
        !authorizedEmails ||
        (account.provider === 'google' &&
          profile.verified_email === true &&
          authorizedEmails.includes(profile.email as string))
      ) {
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    },
    redirect(url: string): Promise<string> {
      return Promise.resolve(url);
    },
  },
};

export default (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(req, res, options);
