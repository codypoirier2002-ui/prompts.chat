# Self-hosting a private, branded copy

This folder runs the whole thing on one VPS: Postgres, the app (built from this repo), and [Caddy](https://caddyserver.com) for automatic HTTPS. Sign-in is GitHub-only and limited to the usernames you list. Every page and API requires login.

## 1. Server

Any Linux VPS with 2 GB RAM or more will do (Hetzner CX22, DigitalOcean 2 GB, etc.). Building the app needs the memory; running it needs much less.

```bash
# On the server (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
git clone https://github.com/<you>/prompts.chat.git
cd prompts.chat/deploy
```

Point a DNS `A` record for your domain (e.g. `prompts.example.com`) at the server's IP. Open ports 80 and 443.

## 2. GitHub OAuth app

On GitHub, go to <https://github.com/settings/developers>, then **OAuth Apps**, then **New OAuth App**:

| Field | Value |
|---|---|
| Homepage URL | `https://prompts.example.com` |
| Authorization callback URL | `https://prompts.example.com/api/auth/callback/github` |

Copy the Client ID, then generate a client secret.

## 3. Configure

```bash
cp .env.example .env
openssl rand -base64 32   # run twice: POSTGRES_PASSWORD and AUTH_SECRET
nano .env
```

Fill in `DOMAIN`, the two secrets, `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`, and `AUTH_ALLOWED_GITHUB_USERS` (yourself plus your teammates, comma-separated).

## 4. Start

```bash
docker compose up -d                            # first build takes a few minutes
docker compose logs -f app                      # wait for "Starting application"
docker compose --profile seed run --rm seed     # load the community prompt library (once)
```

Open `https://prompts.example.com` and sign in with GitHub.

The seed also creates an `admin@prompts.chat` / `password123` account. It can't be used while email/password login is off, which it is here. If you ever add `credentials` to the auth providers, change that password first.

## 5. Make yourself admin

Sign in once so your account exists, then:

```bash
docker compose exec db psql -U prompts -c \
  "UPDATE users SET role = 'ADMIN' WHERE \"githubUsername\" = 'your-github-username';"
```

Sign out and back in. The admin dashboard is at `/admin`.

## Branding

| What | Where | Needs rebuild? |
|---|---|---|
| Name, description, primary color, radius/variant | `PCHAT_*` in `deploy/.env`, then `docker compose up -d` | No |
| Logo | Replace `public/brand/logo.svg` and `logo-dark.svg` | Yes |
| Browser tab icon | Replace the files in `public/favicon/` | Yes |
| Anything else (features, locales, auth providers) | `prompts.config.ts` | Yes |

"Rebuild" just means `docker compose up -d`, which always rebuilds the app image from your checkout.

## Day-to-day

```bash
# Add a teammate: append their GitHub username to AUTH_ALLOWED_GITHUB_USERS, then
docker compose up -d

# Update to your latest code
git pull && docker compose up -d

# Back up the database
docker compose exec db pg_dump -U prompts prompts | gzip > backup-$(date +%F).sql.gz
```

Removing someone from `AUTH_ALLOWED_GITHUB_USERS` stops them from signing in again. A session they already have keeps working until it expires. To cut them off immediately, delete their user at `/admin`.

## Trying it locally first

Set `DOMAIN=localhost` in `.env`, then use `http://localhost` as the GitHub app's homepage and `https://localhost/api/auth/callback/github` as its callback URL. Caddy serves a self-signed certificate, so your browser will warn you once.
