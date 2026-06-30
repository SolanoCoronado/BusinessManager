import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/v1/health", async () => {
    return {
      status: "ok",
      service: "ledgerlocal-server",
      time: new Date().toISOString(),
    };
  });
}
