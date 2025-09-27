export type Site = {
  id: string
  name: string
  subdomain: string
  url: string
  githubRepo?: string
  vercelProjectId?: string
  createdAt: string
  status?: 'active' | 'archived' | 'graduated'
}
