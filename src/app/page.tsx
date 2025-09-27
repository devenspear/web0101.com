import { getSites } from '@/lib/sites'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const sites = await getSites()
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold">Prototypes</h1>
        <p className="text-gray-600">Directory of active prototypes hosted under web0101.com</p>
      </section>
      <ul className="divide-y divide-gray-200 border rounded">
        {sites.length === 0 && (
          <li className="p-4 text-gray-500">No sites yet. Create one in the Admin page.</li>
        )}
        {sites.map((s) => (
          <li key={s.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
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
          </li>
        ))}
      </ul>
    </div>
  )
}
