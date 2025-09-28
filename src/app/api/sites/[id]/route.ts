import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROOT_DOMAIN } from '@/lib/config'
import { fetchSitesAndSha, commitSitesJson } from '@/lib/github'
import { removeDomainAliasFromProject } from '@/lib/vercel'
import { ADMIN_COOKIE_NAME, adminCookieOptions, readAdminSession } from '@/lib/admin-session'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const session = readAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)
  if (!session.valid) {
    const res = NextResponse.json({ ok: false, error: 'Session expired. Please sign in again.' }, { status: 401 })
    res.cookies.delete(ADMIN_COOKIE_NAME)
    return res
  }

  function respond(body: Record<string, unknown>, init?: ResponseInit) {
    const res = NextResponse.json(body, init)
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }

  const id = params.id
  if (!id) return respond({ ok: false, error: 'Missing id' }, { status: 400 })

  try {
    const { sites } = await fetchSitesAndSha()
    const idx = sites.findIndex((s) => s.id === id)
    if (idx === -1) return respond({ ok: false, error: 'Not found' }, { status: 404 })

    const site = sites[idx]
    const domain = `${site.subdomain}.${ROOT_DOMAIN}`

    if (site.vercelProjectId) {
      try {
        await removeDomainAliasFromProject(site.vercelProjectId, domain)
      } catch (e) {
        // non-fatal
        console.error(e)
      }
    }

    const nextSites = sites.slice(0, idx).concat(sites.slice(idx + 1))
    await commitSitesJson(nextSites, `Remove site: ${site.name} (${site.id})`)

    return respond({ ok: true })
  } catch (err: any) {
    return respond({ ok: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
