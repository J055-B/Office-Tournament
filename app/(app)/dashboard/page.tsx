import React from 'react'
import LiveLeaderboard from '../../../components/leaderboard/LiveLeaderboard'
import LiveStatusBadge from '../../../components/leaderboard/LiveStatusBadge'
import HeroPanel from '../../../components/hero/HeroPanel'
import RouteOverview from '../../../components/stage/RouteOverview'
import StageSummary from '../../../components/stage/StageSummary'
import { getLeaderboard, getRoute } from '../../../lib/data-source'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const leaderboard = await getLeaderboard()
  const route = await getRoute()
  const leader = leaderboard[0]
  return (
    <div className="grid grid-cols-12 gap-6 items-stretch">
      <div className="col-span-12 xl:col-span-8 space-y-6">
        <HeroPanel teams={leaderboard} />
        <div className="rounded-lg p-6 app-surface">
          <div className="flex items-center gap-3 mb-6">
            <LiveStatusBadge />
            <h2 className="text-2xl font-extrabold italic shimmer-text">LIVE LEADERBOARD</h2>
          </div>
          <LiveLeaderboard entries={leaderboard} />
        </div>
      </div>
      {/* Route Overview grows to fill this whole column's height (matching Hero + Leaderboard on the left); Stage Summary sits fixed-size below it. */}
      <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
        <RouteOverview leader={leader} teams={leaderboard} waypoints={route} />
        <StageSummary team={leader} />
      </div>
    </div>
  )
}
