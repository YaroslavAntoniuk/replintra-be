// middleware/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { Container, Service } from 'typedi';
import { DatabaseService } from '../services/db.service';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  onboardingComplete?: boolean;
  role?: string;
  tenantId?: string;
  tenant?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TenantContext {
  tenantId?: string;
  orgId?: string;
  userId: string;
  role?: string;
}

@Service()
export class AuthMiddleware {
  constructor(private databaseService: DatabaseService) {}

  // API Key validation for chatbot endpoints
  async validateApiKey(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers['authorization'];

    if (!this.isValidAuthHeader(authHeader)) {
      return reply.code(401).send({ error: 'Missing API key' });
    }

    const apiKey = this.extractApiKey(authHeader);
    const chatbot = await this.findChatbotByApiKey(apiKey);

    if (!chatbot) {
      return reply.code(403).send({ error: 'Invalid API key' });
    }

    (request as any).chatbot = chatbot;
  }

  // JWT user extraction
  getUserFromJWT(request: FastifyRequest): AuthUser | null {
    const user = (request as any).user;
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

  // Multi-tenant context extraction
  getTenantContext(request: FastifyRequest): TenantContext {
    const user = this.getUserFromJWT(request);
    if (!user) throw new Error('No user in request');
    return {
      tenantId: user.tenantId,
      orgId: user.tenant?.id || user.tenantId,
      userId: user.id,
      role: user.role,
    };
  }

  // Role-based access control
  requireRole(role: string | string[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = this.getUserFromJWT(request);
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!user.role || !allowedRoles.includes(user.role.toUpperCase())) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    };
  }

  // Helper methods for API key validation
  private isValidAuthHeader(
    authHeader: string | undefined
  ): authHeader is string {
    return !!authHeader && authHeader.startsWith('Bearer ');
  }

  private extractApiKey(authHeader: string): string {
    return authHeader.substring(7);
  }

  private async findChatbotByApiKey(apiKey: string) {
    return this.databaseService.client.chatbot.findFirst({ where: { apiKey } });
  }
}

// Factory functions for Fastify middleware usage
export function createAuthMiddleware() {
  const authMiddleware = Container.get(AuthMiddleware);
  return authMiddleware.validateApiKey.bind(authMiddleware);
}

export function createRoleMiddleware(role: string | string[]) {
  const authMiddleware = Container.get(AuthMiddleware);
  return authMiddleware.requireRole(role);
}
