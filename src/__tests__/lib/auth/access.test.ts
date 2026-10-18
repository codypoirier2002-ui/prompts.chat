import { describe, it, expect, afterEach, vi } from "vitest";
import { isLoginRequired, isSignInAllowed } from "@/lib/auth/access";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isLoginRequired", () => {
  it("is off by default", () => {
    vi.stubEnv("PCHAT_REQUIRE_LOGIN", "");
    expect(isLoginRequired()).toBe(false);
  });

  it.each(["true", "TRUE", "1"])("is on for %s", (value) => {
    vi.stubEnv("PCHAT_REQUIRE_LOGIN", value);
    expect(isLoginRequired()).toBe(true);
  });
});

describe("isSignInAllowed", () => {
  it("allows everyone when no allowlist is set", () => {
    vi.stubEnv("AUTH_ALLOWED_GITHUB_USERS", "");
    vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", "");
    expect(isSignInAllowed({ email: "anyone@example.com", githubUsername: "anyone" })).toBe(true);
  });

  it("matches GitHub usernames case-insensitively", () => {
    vi.stubEnv("AUTH_ALLOWED_GITHUB_USERS", "Alice, bob");
    expect(isSignInAllowed({ githubUsername: "alice" })).toBe(true);
    expect(isSignInAllowed({ githubUsername: "BOB" })).toBe(true);
    expect(isSignInAllowed({ githubUsername: "mallory", email: "mallory@example.com" })).toBe(false);
  });

  it("matches email domains exactly", () => {
    vi.stubEnv("AUTH_ALLOWED_EMAIL_DOMAINS", "acme.com");
    expect(isSignInAllowed({ email: "jo@ACME.com" })).toBe(true);
    expect(isSignInAllowed({ email: "jo@notacme.com" })).toBe(false);
    expect(isSignInAllowed({ email: "jo@acme.com.evil.io" })).toBe(false);
    expect(isSignInAllowed({ email: null })).toBe(false);
  });

  it("does not treat a missing GitHub username as a match", () => {
    vi.stubEnv("AUTH_ALLOWED_GITHUB_USERS", "alice");
    expect(isSignInAllowed({ githubUsername: undefined, email: "alice@example.com" })).toBe(false);
  });
});
