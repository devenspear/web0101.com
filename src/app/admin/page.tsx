import { cookies } from 'next/headers'
import { getSites } from '@/lib/sites'
import { ROOT_DOMAIN } from '@/lib/config'
import AdminClient from '@/components/AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = cookies().get('admin')?.value === '1'
  const sites = admin ? await getSites() : []
  if (!admin) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Admin login</h1>
        <form method="post" action="/api/auth/login" className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" className="mt-1 w-full rounded border px-3 py-2" required />
          </div>
          <button className="rounded bg-black text-white px-4 py-2">Sign in</button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded border p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Create / link a prototype</h1>
        <p className="text-gray-600 mb-4">Add a record to the registry and optionally attach a subdomain to an existing Vercel project.</p>
        <AdminClient rootDomain={ROOT_DOMAIN} initialSites={sites} />
      </section>

      <section className="rounded border p-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Existing prototypes</h2>
        <ul className="divide-y divide-gray-200 border rounded">
          {sites.length === 0 && (
            <li className="p-4 text-gray-500">No sites yet.</li>
          )}
          {sites.map((s) => (
            <li key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-600">{s.url}</div>
                </div>
                <div className="text-sm text-blue-600 space-x-4">
                  <a className="hover:underline" href={s.url} target="_blank" rel="noreferrer">Open</a>
                  {s.githubRepo && (
                    <a className="hover:underline" href={`https://github.com/${s.githubRepo}`} target="_blank" rel="noreferrer">Repo</a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
