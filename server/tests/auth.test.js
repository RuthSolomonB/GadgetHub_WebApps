/* @vitest-environment node */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, clearDatabase, connectTestDatabase, disconnectTestDatabase } from "./testServer.js";

describe("auth routes", () => {
  const app = buildTestApp();

  beforeAll(connectTestDatabase);
  afterEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  it("registers a customer and restores the session", async () => {
    const registerResponse = await request(app).post("/api/auth/register").send({
      email: "customer@example.com",
      password: "Password123!",
      displayName: "Customer One",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeTypeOf("string");
    expect(registerResponse.body.user.role).toBe("customer");

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe("customer@example.com");
  });

  it("rejects invalid login credentials", async () => {
    await request(app).post("/api/auth/register").send({
      email: "customer@example.com",
      password: "Password123!",
      displayName: "Customer One",
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "customer@example.com",
      password: "wrong-password",
    });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.message).toMatch(/invalid email or password/i);
  });
});
