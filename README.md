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

### Deployments, preview protection, and customer domains

- The admin tool only wires up domains; it does **not** toggle Vercel preview/production protection. If a project has preview protection turned on, any alias pointed at a *preview* deployment will show the Vercel login wall to visitors.
- To keep subdomains public, ensure there is a production deployment for the target project (push to the project’s production branch or run `vercel --prod`) and attach the alias after that build finishes. Production deployments are public even when preview protection remains on for previews.
- If you intentionally want to drop preview protection programmatically, you would need to call Vercel’s `/v9/projects` API to update `passwordProtection` for the entire project. We currently leave this as a manual dashboard action for safety.

## Notes
- The registry is fetched from GitHub raw content so directory updates appear without redeploys.
- Later enhancements: automatic creation of GitHub repos from a template, automated Vercel project creation, search, tagging, archive/delete flows, shadcn/ui components.
- Admin sessions last for up to one hour of inactivity. Re-authentication is required whenever a new browser session begins.
- The public landing page and admin surfaces intentionally use a dark, glassmorphism-inspired theme; adjust Tailwind tokens in `src/app/globals.css` if you want to rebrand.

## Local development

- `npm install`
- `npm run dev`
