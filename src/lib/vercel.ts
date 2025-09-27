import { VERCEL_TOKEN, VERCEL_TEAM_ID } from '@/lib/config'

const VC_API = 'https://api.vercel.com'

function assertVercelToken() {
  if (!VERCEL_TOKEN) throw new Error('Missing VERCEL_TOKEN env var')
}

export async function addDomainAliasToProject(projectId: string, domain: string) {
  assertVercelToken()
  const url = new URL(`${VC_API}/v2/projects/${projectId}/domains`)
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
    cache: 'no-store',
  })

  if (res.status === 409) return // already added
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vercel alias failed: ${res.status} ${text}`)
  }
}
