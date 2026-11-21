import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/options';

/**
 * Whether the request carries the API token (used by the image processor).
 * Requests are only accepted with a token when API_TOKEN is configured.
 */
function hasValidApiToken(req: NextApiRequest) {
  const token = process.env.API_TOKEN;
  if (!token) return false;

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;

  return timingSafeEqual(header.slice('Bearer '.length), token);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const secure = (handler: NextApiHandler) => async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // Only the environment and the API token can skip the session check;
  // request headers such as Host are client-controlled.
  if (process.env.NODE_ENV === 'development' || hasValidApiToken(req)) {
    return handler(req, res);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end('Not authorized');
  }

  return handler(req, res);
};

export default secure;
