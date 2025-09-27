import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from '@/lib/config'
import type { Site } from '@/lib/types'

const GH_API = 'https://api.github.com'

function assertToken() {
  if (!GITHUB_TOKEN) throw new Error('Missing GITHUB_TOKEN env var')
}

export async function fetchSitesAndSha(): Promise<{ sites: Site[]; sha: string | null }> {
  const url = `${GH_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/sites.json`
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  const res = await fetch(url, { headers, cache: 'no-store' })
  if (res.status === 404) return { sites: [], sha: null }
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`)
  const json = await res.json()
  const content = Buffer.from(json.content, 'base64').toString('utf8')
  const sites = JSON.parse(content) as Site[]
  return { sites, sha: json.sha as string }
}

export async function commitSitesJson(sites: Site[], message: string) {
  assertToken()
  const url = `${GH_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/sites.json`
  // Get current SHA if exists
  const { sha } = await fetchSitesAndSha()
  const newContent = Buffer.from(JSON.stringify(sites, null, 2), 'utf8').toString('base64')
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      message,
      content: newContent,
      sha: sha ?? undefined,
      branch: 'main',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub write failed: ${res.status} ${text}`)
  }
}
