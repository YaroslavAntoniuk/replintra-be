/**
 * Extracts tenant, org, and user context from the request's JWT.
 * Throws if no user is present.
 */
import { FastifyRequest } from 'fastify';
import { getUserFromJWT } from './jwt';

export function getTenantContext(request: FastifyRequest) {
  const user = getUserFromJWT(request);
  if (!user) throw new Error('No user in request');
  return {
    tenantId: user.tenantId,
    orgId: user.tenant?.id || user.tenantId, // orgId fallback to tenantId
    userId: user.id,
    role: user.role,
  };
}
