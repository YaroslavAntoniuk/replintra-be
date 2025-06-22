// auth/jwt.ts - Updated version with type assertion
import { FastifyRequest } from 'fastify';

/**
 * AuthUser interface matches the NextAuth JWT/session shape.
 * All fields are optional except id and email, but most are present in production.
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  onboardingComplete?: boolean;
  role?: string;
  tenantId?: string;
  tenant?: any; // Use a more specific type if available
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Extracts the AuthUser from a Fastify request after JWT verification.
 * Returns null if no user is present.
 */
export function getUserFromJWT(request: FastifyRequest): AuthUser | null {
  const user = (request as any).user; // Type assertion to bypass TypeScript error
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    onboardingComplete: user.onboardingComplete,
    role: user.role,
    tenantId: user.tenantId,
    tenant: user.tenant,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
