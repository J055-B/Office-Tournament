import React from 'react'
import { getTeams } from '../../../lib/data-source'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const teams = await getTeams()
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Teams</h1>
      <div className="grid grid-cols-3 gap-4">
        {teams.map((t) => (
          <div key={t.id} className="p-4 app-surface rounded">
            <div className="font-bold">{t.teamCode}</div>
            <div className="text-sm text-secondaryText">{t.location} • {t.language}</div>
            <div className="mt-2">Total distance: —</div>
          </div>
        ))}
      </div>
    </div>
  )
}
