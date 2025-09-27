import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROOT_DOMAIN } from '@/lib/config'
import type { Site } from '@/lib/types'
import { commitSitesJson, fetchSitesAndSha } from '@/lib/github'
import { addDomainAliasToProject } from '@/lib/vercel'

function toSlugSubdomain(input: string) {
  // normalize and replace whitespace with hyphens
  const base = input.toLowerCase().trim().replace(/\s+/g, '-')
  // remove any characters that are not allowed
  const cleaned = base.replace(/[^a-z0-9-]/g, '')
  // collapse multiple hyphens
  return cleaned.replace(/-+/g, '-')
}

export async function GET() {
  const { sites } = await fetchSitesAndSha()
  return NextResponse.json(sites, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  // Simple admin check
  if (cookies().get('admin')?.value !== '1') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''
  const wantsJson = (req.headers.get('accept') || '').includes('application/json')
  let name = ''
  let subdomain = ''
  let githubRepo = ''
  let vercelProjectId = ''

  if (contentType.includes('application/json')) {
    const body = await req.json()
    name = String(body.name || '')
    subdomain = String(body.subdomain || '')
    githubRepo = String(body.githubRepo || '')
    vercelProjectId = String(body.vercelProjectId || '')
  } else {
    const form = await req.formData()
    name = String(form.get('name') || '')
    subdomain = String(form.get('subdomain') || '')
    githubRepo = String(form.get('githubRepo') || '')
    vercelProjectId = String(form.get('vercelProjectId') || '')
  }

  if (!name || !subdomain) {
    const msg = 'Missing required fields'
    return wantsJson ? NextResponse.json({ ok: false, error: msg }, { status: 400 }) : new NextResponse(msg, { status: 400 })
  }

  const id = toSlugSubdomain(subdomain)
  // Validate final id
  if (!/^[a-z0-9-]{1,63}$/.test(id) || id.startsWith('-') || id.endsWith('-')) {
    const msg = 'Invalid subdomain. Use only letters, numbers, and hyphens.'
    return wantsJson ? NextResponse.json({ ok: false, error: msg }, { status: 400 }) : new NextResponse(msg, { status: 400 })
  }

  const domain = `${id}.${ROOT_DOMAIN}`
  const url = `https://${domain}`

  try {
    const { sites } = await fetchSitesAndSha()
    if (sites.some((s) => s.id === id)) {
      const msg = 'Subdomain already exists'
      return wantsJson ? NextResponse.json({ ok: false, error: msg }, { status: 409 }) : new NextResponse(msg, { status: 409 })
    }

    const site: Site = {
      id,
      name,
      subdomain: id,
      url,
      githubRepo: githubRepo || undefined,
      vercelProjectId: vercelProjectId || undefined,
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    let aliasAdded = false
    let aliasMessage: string | undefined

    // Try to attach domain alias if project is provided
    if (vercelProjectId) {
      try {
        const res = await addDomainAliasToProject(vercelProjectId, domain)
        aliasAdded = !!res?.added
        aliasMessage = res?.message
      } catch (e: any) {
        aliasMessage = e?.message || 'Failed to attach domain alias'
      }
    }

    const nextSites = [...sites, site]
    await commitSitesJson(nextSites, `Add site: ${name} (${id})`)

    if (wantsJson) {
      return NextResponse.json({ ok: true, site, aliasAdded, aliasMessage })
    } else {
      // Redirect back to admin
      const res = NextResponse.redirect(new URL('/admin', req.url))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }
  } catch (err: any) {
    const msg = err?.message || 'Unexpected error'
    return wantsJson ? NextResponse.json({ ok: false, error: msg }, { status: 500 }) : new NextResponse(msg, { status: 500 })
  }
}
