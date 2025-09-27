import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROOT_DOMAIN } from '@/lib/config'
import { fetchSitesAndSha, commitSitesJson } from '@/lib/github'
import { removeDomainAliasFromProject } from '@/lib/vercel'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (cookies().get('admin')?.value !== '1') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

  try {
    const { sites } = await fetchSitesAndSha()
    const idx = sites.findIndex((s) => s.id === id)
    if (idx === -1) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
