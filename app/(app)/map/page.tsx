import React from 'react'
import { getRoute, getLeaderboard } from '../../../lib/data-source'
import { LOOP_KM } from '../../../data/route'
import RouteMapLoader from '../../../components/map/RouteMapLoader'
import MilestoneChart from '../../../components/stage/MilestoneChart'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const route = await getRoute()
  const leaderboard = await getLeaderboard()
  const leader = leaderboard[0]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Route</h1>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-elevated rounded app-surface">
          <div className="text-xs text-secondaryText">TOTAL ROUTE</div>
          <div className="font-bold mt-1">{LOOP_KM.toLocaleString()} KM</div>
        </div>
        <div className="p-3 bg-elevated rounded app-surface">
          <div className="text-xs text-secondaryText">LEADER DISTANCE</div>
          <div className="font-bold mt-1">{leader ? Math.round(leader.totalDistance).toLocaleString() + ' KM' : '—'}</div>
        </div>
      </div>
      <RouteMapLoader waypoints={route} teams={leaderboard} />
      <div className="mt-4">
        <MilestoneChart teams={leaderboard} />
      </div>
    </div>
  )
}
