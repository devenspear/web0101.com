import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROOT_DOMAIN } from '@/lib/config'
import type { Site } from '@/lib/types'
import { commitSitesJson, fetchSitesAndSha } from '@/lib/github'
import { addDomainAliasToProject } from '@/lib/vercel'

export async function GET() {
  const { sites } = await fetchSitesAndSha()
  return NextResponse.json(sites, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  // Simple admin check
  if (cookies().get('admin')?.value !== '1') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''
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
    return new NextResponse('Missing required fields', { status: 400 })
  }

  const id = subdomain.toLowerCase().trim()
  const domain = `${id}.${ROOT_DOMAIN}`
  const url = `https://${domain}`

  const { sites } = await fetchSitesAndSha()
  if (sites.some((s) => s.id === id)) {
    return new NextResponse('Subdomain already exists', { status: 409 })
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

  // Try to attach domain alias if project is provided
  if (vercelProjectId) {
    try {
      await addDomainAliasToProject(vercelProjectId, domain)
    } catch (e) {
      console.error(e)
      // Continue even if alias fails; the registry will still be updated
    }
  }

  const nextSites = [...sites, site]
  await commitSitesJson(nextSites, `Add site: ${name} (${id})`)

  // Redirect back to admin
  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.headers.set('Cache-Control', 'no-store')
  return res
}
