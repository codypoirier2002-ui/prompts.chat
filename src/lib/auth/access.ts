/**
 * Access controls for private deployments, configured via env vars:
 *
 *   PCHAT_REQUIRE_LOGIN=true            Every page and API requires a signed-in user
 *   AUTH_ALLOWED_GITHUB_USERS=a,b       Only these GitHub usernames may sign in
 *   AUTH_ALLOWED_EMAIL_DOMAINS=acme.com Only emails on these domains may sign in
 *
 * With no allowlist set, anyone who can authenticate may sign in (default).
 */

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isLoginRequired(): boolean {
  const value = process.env.PCHAT_REQUIRE_LOGIN?.toLowerCase();
  return value === "true" || value === "1";
}

export function isSignInAllowed({
  email,
  githubUsername,
}: {
  email?: string | null;
  githubUsername?: string | null;
}): boolean {
  const allowedUsers = parseList(process.env.AUTH_ALLOWED_GITHUB_USERS);
  const allowedDomains = parseList(process.env.AUTH_ALLOWED_EMAIL_DOMAINS);

  if (allowedUsers.length === 0 && allowedDomains.length === 0) {
    return true;
  }

  if (githubUsername && allowedUsers.includes(githubUsername.toLowerCase())) {
    return true;
  }

  const domain = email?.split("@").pop()?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}
