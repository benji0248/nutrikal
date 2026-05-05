import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './jwt.js';

export interface AuthenticatedRequest {
  userId: string;
  username: string;
  email: string;
  displayName: string;
}

type MethodHandler = (
  req: VercelRequest,
  res: VercelResponse,
  auth: AuthenticatedRequest,
) => Promise<VercelResponse | void>;

interface HandlerConfig {
  GET?: MethodHandler;
  POST?: MethodHandler;
  PUT?: MethodHandler;
  PATCH?: MethodHandler;
  DELETE?: MethodHandler;
}

export function createHandler(config: HandlerConfig) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const method = req.method as keyof HandlerConfig;
      const handler = config[method];

      if (!handler) {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
      }

      const decoded = verifyToken(authHeader.slice(7));
      const auth: AuthenticatedRequest = {
        userId: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        displayName: decoded.displayName,
      };

      return await handler(req, res, auth);
    } catch (err) {
      if (
        (err as Error).name === 'JsonWebTokenError' ||
        (err as Error).name === 'TokenExpiredError'
      ) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      console.error(`API error [${req.method} ${req.url}]:`, err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
