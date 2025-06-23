import 'reflect-metadata';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import redis from '@fastify/redis';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import { getToken } from 'next-auth/jwt';
import { documentRoutes } from './api/documents';
import { ragRoutes } from './api/rag';

// Load env vars
dotenv.config();

const app = Fastify({
  logger: {
    level: 'debug',
  },
});

async function validateNextAuthToken(token: string) {
  try {
    // Create a mock request object for next-auth
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      cookies: {
        'next-auth.session-token': token,
      },
    };

    // Use NextAuth's getToken function to decrypt the JWE token
    const payload = await getToken({
      req: mockReq as any,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!payload) {
      throw new Error('Invalid token');
    }

    return payload;
  } catch (error) {
    console.error('Token validation error:', error);
    throw new Error('Invalid token');
  }
}

// Register plugins (Fastify v5: all plugins must be awaited or registered in an async context)
async function buildApp() {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(redis, { url: process.env.REDIS_URL, family: 0 });

  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: `${process.env.RATE_LIMIT_WINDOW || 60} seconds`,
  });

  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for public routes and health check
    if (request.url.startsWith('/public') || request.url === '/health') {
      return;
    }

    try {
      // Check for Authorization header first (Bearer token)
      let token = null;
      const authHeader = request.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // Fallback: check for next-auth session token in cookies
        const cookies = request.headers.cookie;
        if (cookies) {
          const match = cookies.match(/next-auth\.session-token=([^;]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }

      if (!token) {
        reply.code(401).send({ error: 'No token provided' });
        return;
      }

      // Validate the token using NextAuth's method
      const payload = await validateNextAuthToken(token);

      // Add user info to request
      (request as any).user = payload;
    } catch (err) {
      console.error('Auth failed:', err);
      reply.code(401).send({ error: 'Invalid token' });
    }
  });

  // Example route
  app.get('/health', async () => ({ status: 'ok' }));

  // Register document API routes
  await app.register(documentRoutes);
  await app.register(ragRoutes);
}

// Start server in an async context
buildApp().then(() => {
  app.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`Server listening at ${address}`);
  });
});

export { app };
