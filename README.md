# web0101.com

Multi-repo prototype hub and admin portal for web0101.com.

## Architecture

- Platform app (this repo) is a Next.js 14 site hosted on Vercel.
- DNS: wildcard `*.web0101.com` points to this platform project (catch-all).
- Each prototype is its own Vercel Project connected to its own GitHub repo.
- The admin can link a subdomain (e.g., `proto.web0101.com`) to an existing Vercel project via the Vercel API.
- A simple JSON registry `data/sites.json` is the source of truth. The admin updates it via the GitHub Contents API.

Specific subdomain requests go to the target project; all other subdomains fall back to this platform.

## Getting started

1) Set environment variables (in Vercel Project Settings → Environment Variables):

- `ADMIN_PASSWORD` — password to access /admin (choose your own)
- `ROOT_DOMAIN` — `web0101.com`
- `GITHUB_OWNER` — `devenspear`
- `GITHUB_REPO` — `web0101.com`
- `GITHUB_TOKEN` — a GitHub Personal Access Token with `repo` scope to commit to this repo
- `VERCEL_TOKEN` — a Vercel token with access to add domain aliases
- `VERCEL_TEAM_ID` — your Vercel team ID (optional if you are on a personal account)

2) Wildcard domain:
- In Vercel, add `*.web0101.com` to this platform project. Because more specific subdomains are attached directly to prototype projects, traffic will route to them first, and fall back here otherwise.

3) Admin portal
- Visit `/admin`, sign in with `ADMIN_PASSWORD`.
- Create/link a prototype by specifying a subdomain and, optionally, a Vercel Project ID to auto-attach the domain alias.
- Optionally include `owner/repo` so the directory links to the GitHub repo.

## Typical flows

- Existing Vercel project: In Admin, enter subdomain `foo` and the project ID `prj_...`. The platform will:
  - Add `foo.web0101.com` as an alias to that Vercel project
  - Append a record in `data/sites.json`

- Existing GitHub repo but no Vercel project: For now, create the Vercel project in the Vercel dashboard (link to the repo), then use the flow above. (Automated project creation can be added later.)

- Graduation: Detach from web0101 by adding a custom domain to the prototype’s Vercel project. Optionally mark `status: "graduated"` manually or by extending the admin.

## Notes
- The registry is fetched from GitHub raw content so directory updates appear without redeploys.
- Later enhancements: automatic creation of GitHub repos from a template, automated Vercel project creation, search, tagging, archive/delete flows, shadcn/ui components.

## Local development

- `npm install`
- `npm run dev`

