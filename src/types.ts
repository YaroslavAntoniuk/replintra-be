import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: any; // You can make this more specific with your AuthUser type if preferred
  }
}
