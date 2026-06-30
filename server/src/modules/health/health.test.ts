import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

describe("GET /api/v1/health", () => {
  it("responde con status ok", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });

    await app.close();
  });
});
