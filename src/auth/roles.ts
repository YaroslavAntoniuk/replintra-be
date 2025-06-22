/**
 * Middleware to require a user to have a specific role or one of several roles.
 * Usage: preHandler: requireRole('ADMIN') or requireRole(['ADMIN', 'USER'])
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { getUserFromJWT } from './jwt';

export function requireRole(role: string | string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromJWT(request);
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!user.role || !allowedRoles.includes(user.role.toUpperCase())) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
