# Deploying to Vercel + Neon

A private copy on Vercel's free (Hobby) plan with a free Neon Postgres database. Everything happens in the browser; nothing to install locally. About 15 minutes.

> Vercel's Hobby plan is for personal, non-commercial use. For a company team, use Vercel Pro or the Docker setup in [README.md](README.md).

## 1. Import the repo into Vercel

1. Sign in at <https://vercel.com> with GitHub.
2. **Add New → Project**, pick your `prompts.chat` fork, click **Import**.
3. Leave the framework (Next.js) and build settings alone. `vercel.json` already runs the database migrations before each build.
4. **Don't click Deploy yet.** Open **Environment Variables** first (step 3 below), or let the first deploy fail and redeploy after adding them. Either is fine.

## 2. Create the database

1. In the new project: **Storage → Create Database → Neon** (Postgres). Accept the defaults and connect it to the project. For the region, pick the one matching your Vercel functions (Vercel's default is Washington, D.C. / `iad1`, so choose **US East (N. Virginia)**). A far-away database makes every page slower.
2. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (plus a few others) to the project automatically.
3. Go to **Settings → Environment Variables**, copy the value of `DATABASE_URL_UNPOOLED`, and add it again as **`DIRECT_URL`**. Migrations need this direct (non-pooled) connection.

## 3. GitHub login

1. Open <https://github.com/settings/developers> → **OAuth Apps → New OAuth App**:

   | Field | Value |
   |---|---|
   | Homepage URL | `https://<your-project>.vercel.app` |
   | Authorization callback URL | `https://<your-project>.vercel.app/api/auth/callback/github` |

   Your project URL is shown on the Vercel project page (Domains).
2. Copy the Client ID and generate a client secret.

## 4. Environment variables

In Vercel, **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `AUTH_SECRET` | a random string: run `openssl rand -base64 32`, or use any password generator for 32+ characters |
| `GITHUB_CLIENT_ID` | from step 3 |
| `GITHUB_CLIENT_SECRET` | from step 3 |
| `PCHAT_REQUIRE_LOGIN` | `true` |
| `AUTH_ALLOWED_GITHUB_USERS` | your GitHub username (comma-separate to add others) |
| `DIRECT_URL` | copy of `DATABASE_URL_UNPOOLED` (step 2) |

Optional: `PCHAT_NAME`, `PCHAT_DESCRIPTION`, `PCHAT_COLOR` to rebrand without code changes.

Then **Deployments → ⋯ → Redeploy** (or click Deploy if you haven't yet).

## 5. Sign in and make yourself admin

1. Open your `.vercel.app` URL and **Sign in with GitHub**.
2. In Vercel, **Storage → your database → Open in Neon → SQL Editor**, run:

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE "githubUsername" = 'your-github-username';
   ```
3. Sign out and back in.

## 6. Load the prompt library

Go to **`/admin`** → **Prompts** tab → **Import CSV** → confirm. It loads the ~2,500 community prompts bundled in `prompts.csv`. If it stops partway (a timeout on a slow run), click it again; prompts already imported are skipped.

## Updating

Every push to `main` redeploys automatically and applies any new migrations.

## Troubleshooting

- **Build fails with `Environment variable not found: DIRECT_URL`**: add `DIRECT_URL` (step 2), then redeploy.
- **GitHub sign-in errors with "redirect_uri is not associated"**: the callback URL in the GitHub OAuth app must exactly match `https://<your-project>.vercel.app/api/auth/callback/github`.
- **"This account isn't allowed to sign in here"**: your username isn't in `AUTH_ALLOWED_GITHUB_USERS`, or has a typo. Fix it and redeploy (env changes need a redeploy).
