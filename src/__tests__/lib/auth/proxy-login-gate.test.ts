// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { proxy } from "@/proxy";

const SECRET = "test-secret-at-least-32-characters-long!!";

async function sessionCookie(name: string) {
  const token = await encode({ token: { id: "u1", sub: "u1" }, secret: SECRET, salt: name });
  return `${name}=${token}`;
}

function request(path: string, cookie?: string) {
  return new NextRequest(`https://prompts.example.com${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy login gate", () => {
  it("does nothing when PCHAT_REQUIRE_LOGIN is off", async () => {
    vi.stubEnv("PCHAT_REQUIRE_LOGIN", "");
    const res = await proxy(request("/prompts"));
    expect(res.status).toBe(200);
  });

  describe("when PCHAT_REQUIRE_LOGIN is on", () => {
    beforeEach(() => {
      vi.stubEnv("PCHAT_REQUIRE_LOGIN", "true");
    });

    it("redirects anonymous page requests to /login", async () => {
      const res = await proxy(request("/prompts?q=x"));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    });

    it("returns 401 for anonymous API requests", async () => {
      const res = await proxy(request("/api/prompts"));
      expect(res.status).toBe(401);
    });

    it("gates raw prompt files", async () => {
      const res = await proxy(request("/prompts/abc.prompt.md"));
      expect(res.status).toBe(307);
    });

    it.each(["/login", "/api/auth/signin", "/api/health", "/api/mcp", "/api/cron/reset-credits"])(
      "leaves %s reachable",
      async (path) => {
        const res = await proxy(request(path));
        expect(res.status).toBe(200);
      }
    );

    it("does not treat lookalike paths as public", async () => {
      const res = await proxy(request("/loginx"));
      expect(res.status).toBe(307);
    });

    it("lets through a valid secure session cookie", async () => {
      const cookie = await sessionCookie("__Secure-authjs.session-token");
      const res = await proxy(request("/prompts", cookie));
      expect(res.status).toBe(200);
    });

    it("lets through a valid non-secure session cookie", async () => {
      const cookie = await sessionCookie("authjs.session-token");
      const res = await proxy(request("/prompts", cookie));
      expect(res.status).toBe(200);
    });

    it("rejects a forged session cookie", async () => {
      const res = await proxy(request("/prompts", "__Secure-authjs.session-token=forged"));
      expect(res.status).toBe(307);
    });

    it("rejects a token signed with a different secret", async () => {
      const token = await encode({
        token: { id: "u1" },
        secret: "some-other-secret-that-is-long-enough!!",
        salt: "__Secure-authjs.session-token",
      });
      const res = await proxy(request("/prompts", `__Secure-authjs.session-token=${token}`));
      expect(res.status).toBe(307);
    });
  });
});
