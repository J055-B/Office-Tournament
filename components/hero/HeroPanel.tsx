"use client"
import React from 'react'
import { LeaderboardEntry } from '../../lib/types'
import { videoUrlForDistance } from '../../lib/city-videos'
import { flagUrl } from '../../lib/flags'
import { tourDayInfo } from '../../lib/calculations'
import { positionForDistance } from '../../data/route'
import { MILESTONE_STAGES, milestonePositionForDistance } from '../../lib/milestones'

function CardShell({ videoUrl, children }: { videoUrl: string; children: React.ReactNode }) {
  return (
    <div className="relative flex-1 min-w-0 overflow-hidden">
      <video key={videoUrl} className="absolute inset-0 w-full h-full object-cover" src={videoUrl} autoPlay muted loop playsInline />
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/15" />
      <div className="relative h-full flex flex-col justify-between p-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.55)' }}>
        {children}
      </div>
    </div>
  )
}

export default function HeroPanel({ teams }: { teams: LeaderboardEntry[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-lg overflow-hidden app-surface h-56 flex items-center justify-center text-secondaryText">
        TOUR DE CALLISTO
      </div>
    )
  }

  const leader = teams[0]
  const last = teams[teams.length - 1]
  const { day, totalDays } = tourDayInfo()

  // LEADER
  const leaderPos = milestonePositionForDistance(leader.totalDistance)
  const leaderStage = MILESTONE_STAGES[leaderPos.stageIndex - 1]
  const leaderProgressPct = leaderPos.fraction * 100
  const leaderVideo = videoUrlForDistance(leader.totalDistance)
  const leaderFlag = flagUrl(leader.countryCode)
  const leaderCity = leader.currentStage?.split('→')[0]?.trim() || leader.countryName

  // NEXT STAGE — the milestone right after the leader's current one.
  const nextIndex = leaderPos.stageIndex === MILESTONE_STAGES.length ? 1 : leaderPos.stageIndex + 1
  const nextStage = MILESTONE_STAGES[nextIndex - 1]
  const nextPosition = positionForDistance(nextStage.realFromKm)
  const nextVideo = videoUrlForDistance(nextStage.realFromKm)
  const nextFlag = flagUrl(nextPosition.countryCode)
  const nextCity = nextStage.label.split('→')[0].trim()

  // LAST
  const lastPos = milestonePositionForDistance(last.totalDistance)
  const lastStage = MILESTONE_STAGES[lastPos.stageIndex - 1]
  const lastProgressPct = lastPos.fraction * 100
  const lastVideo = videoUrlForDistance(last.totalDistance)
  const lastFlag = flagUrl(last.countryCode)
  const lastCity = last.currentStage?.split('→')[0]?.trim() || last.countryName

  const showLastAndNext = teams.length > 1

  return (
    <div className="rounded-lg overflow-hidden app-surface">
      <div className="flex flex-col sm:flex-row h-[760px] sm:h-[26rem] divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* LAST */}
        {showLastAndNext && (
          <CardShell videoUrl={lastVideo}>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-elevated/80 border border-border text-secondaryText backdrop-blur-sm">
                LAST
              </span>
              <div className="mt-2.5 leading-none">
                <span className="text-2xl font-bold">STAGE </span>
                <span className="text-2xl font-bold text-secondaryText">{lastStage.index}</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold tracking-wide">{(last.currentStage || lastStage.label).toUpperCase()}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white font-semibold bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
                <span className="font-bold text-primaryText">{last.teamCode}</span>
                <span className="text-secondaryText">·</span>
                <span className="inline-flex items-center gap-1.5">
                  {lastFlag && <img src={lastFlag} alt="" className="w-4 h-2.5 rounded-sm object-cover" />}
                  {lastCity}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-secondaryText tracking-widest">STAGE PROGRESS</span>
                <span className="text-xs text-secondaryText font-bold">{lastProgressPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-secondaryText rounded-full" style={{ width: `${Math.min(100, lastProgressPct).toFixed(1)}%` }} />
                </div>
                <span className="text-[10px] text-secondaryText whitespace-nowrap">{lastStage.widthKm.toLocaleString()} KM</span>
              </div>
            </div>
          </CardShell>
        )}

        {/* LEADER */}
        <CardShell videoUrl={leaderVideo}>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-positive via-[#7be04a] to-positive bg-[length:250%_100%] animate-liveBadge text-black px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-liveDot" />
              LIVE NOW
            </div>

            <div className="mt-2.5 leading-none flex items-center flex-wrap gap-x-2.5 gap-y-1.5">
              <span>
                <span className="text-3xl font-bold">STAGE </span>
                <span className="text-3xl font-bold text-yellow">{leaderStage.index}</span>
              </span>
              {leaderStage.isPowerStage && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide bg-electric/20 text-electric border border-electric/50">
                  {leaderStage.powerLabel}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm font-semibold tracking-wide">{(leader.currentStage || leaderStage.label).toUpperCase()}</div>

            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white font-semibold flex-wrap bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="text-yellow font-bold">LEADER: {leader.teamCode}</span>
              <span className="text-secondaryText">·</span>
              <span>
                DAY {day} of {totalDays}
              </span>
              <span className="text-secondaryText">·</span>
              <span className="inline-flex items-center gap-1.5">
                {leaderFlag && <img src={leaderFlag} alt="" className="w-4 h-2.5 rounded-sm object-cover" />}
                {leaderCity}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-secondaryText tracking-widest">STAGE PROGRESS</span>
              <span className="text-xs text-positive font-bold">{leaderProgressPct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-positive rounded-full" style={{ width: `${Math.min(100, leaderProgressPct).toFixed(1)}%` }} />
              </div>
              <span className="text-[10px] text-secondaryText whitespace-nowrap">{leaderStage.widthKm.toLocaleString()} KM</span>
            </div>
          </div>
        </CardShell>

        {/* NEXT STAGE */}
        {showLastAndNext && (
          <CardShell videoUrl={nextVideo}>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-electric/20 border border-electric/50 text-electric backdrop-blur-sm">
                NEXT STAGE {nextStage.index}
              </span>
              <div className="mt-2.5 text-lg font-bold leading-tight">{nextStage.label.toUpperCase()}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white font-semibold bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
                {nextFlag && <img src={nextFlag} alt="" className="w-4 h-2.5 rounded-sm object-cover" />}
                {nextCity}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-secondaryText tracking-widest">STAGE DISTANCE</div>
              <div className="text-2xl font-bold text-electric mt-1">{nextStage.widthKm.toLocaleString()} KM</div>
            </div>
          </CardShell>
        )}
      </div>
    </div>
  )
}
