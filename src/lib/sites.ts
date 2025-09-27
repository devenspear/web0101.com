import { Site } from '@/lib/types'
import { GITHUB_OWNER, GITHUB_REPO } from '@/lib/config'
import fs from 'node:fs/promises'

export async function getSites(): Promise<Site[]> {
  // Try GitHub raw (public) first so updates reflect without redeploy.
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/data/sites.json`
  try {
    const res = await fetch(rawUrl, { next: { revalidate: 0 } })
    if (res.ok) {
      return (await res.json()) as Site[]
    }
  } catch {}

  // Fallback to local file (useful during dev)
  try {
    const file = await fs.readFile('data/sites.json', 'utf8')
    return JSON.parse(file) as Site[]
  } catch {
    return []
  }
}
