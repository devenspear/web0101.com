import { cookies } from 'next/headers'
import { getSites } from '@/lib/sites'
import { ROOT_DOMAIN } from '@/lib/config'

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
      <section>
        <h1 className="text-2xl font-semibold mb-2">Create / link a prototype</h1>
        <p className="text-gray-600 mb-4">This will add a record to the registry and optionally attach a subdomain to an existing Vercel project.</p>
        <form method="post" action="/api/sites" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input name="name" type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="My Prototype" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Subdomain</label>
            <div className="mt-1 flex items-center">
              <input name="subdomain" type="text" className="w-full rounded-l border px-3 py-2" placeholder="myproto" required />
              <span className="rounded-r border border-l-0 px-3 py-2 text-sm bg-gray-50">.{ROOT_DOMAIN}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">GitHub repo (owner/name)</label>
            <input name="githubRepo" type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="devenspear/my-prototype" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Vercel Project ID (optional)</label>
            <input name="vercelProjectId" type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="prj_..." />
            <p className="text-xs text-gray-500 mt-1">If provided, the subdomain will be attached to this Vercel project automatically.</p>
          </div>
          <div className="md:col-span-2">
            <button className="rounded bg-black text-white px-4 py-2">Create</button>
          </div>
        </form>
      </section>

      <section>
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
