"use client"
import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { LeaderboardEntry } from '../../lib/types'
import { MILESTONE_STAGES, milestonePositionForDistance } from '../../lib/milestones'

const TEAM_LIST_COLS = '48px 1.3fr 1.3fr 1.6fr 1fr'

interface TeamPosition {
  team: LeaderboardEntry
  stageIndex: number
  fraction: number
}

export default function MilestoneChart({ teams }: { teams: LeaderboardEntry[] }) {
  const positions: TeamPosition[] = useMemo(
    () => teams.map((team) => ({ team, ...milestonePositionForDistance(team.totalDistance) })),
    [teams]
  )

  // Opens on the leader's current stage (teams[] arrives sorted by distance).
  const [activeIndex, setActiveIndex] = useState(positions[0]?.stageIndex ?? 1)
  const stage = MILESTONE_STAGES[activeIndex - 1]

  const onThisStage = positions.filter((p) => p.stageIndex === activeIndex)

  const goPrev = () => setActiveIndex((i) => (i === 1 ? MILESTONE_STAGES.length : i - 1))
  const goNext = () => setActiveIndex((i) => (i === MILESTONE_STAGES.length ? 1 : i + 1))

  // Start/end city names, pulled out of "Sofia → Trieste" for the axis end-caps.
  const [startCity, endCity] = stage.label.split('→').map((s) => s.trim())

  return (
    <div className="rounded-lg p-4 app-surface">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-secondaryText">Daily Milestone</p>
          <h3 className="text-lg font-bold mt-0.5">
            STAGE {stage.index} — {stage.label.toUpperCase()}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stage.isPowerStage && (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-electric/20 text-electric border border-electric/50">
              {stage.powerLabel}
            </div>
          )}
          <div className="text-sm font-bold text-secondaryText">{stage.widthKm.toLocaleString()} KM</div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <button
          onClick={goPrev}
          className="shrink-0 w-9 h-9 rounded-full border border-border text-secondaryText hover:bg-yellow/10 hover:text-yellow transition flex items-center justify-center"
          aria-label="Previous stage"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {/* The flat bar */}
          <div className="relative h-16">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-electric/70" />

            {stage.points.map((p, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${p.fraction * 100}%` }}
                title={p.name}
              >
                <div className="w-2 h-2 rounded-full bg-page border border-secondaryText" />
              </div>
            ))}

            {onThisStage.map(({ team, fraction }) => (
              <div
                key={team.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
                style={{ left: `${fraction * 100}%` }}
                title={`${team.teamCode} — ${Math.round(team.totalDistance).toLocaleString()} km`}
              >
                <div className="px-1.5 py-0.5 rounded-full bg-elevated border border-yellow text-[9px] font-bold whitespace-nowrap shadow-[0_0_6px_-1px_rgba(255,212,0,0.7)]">
                  {team.teamCode}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow mt-0.5" />
              </div>
            ))}
          </div>

          {/* Distance axis — real km-at-that-city under each point, not generic round intervals */}
          <div className="relative h-11 mt-1 border-t border-border pt-1.5">
            <div className="absolute top-1.5 left-0 text-[10px] text-secondaryText">
              <div className="font-bold text-primaryText">0</div>
              <div className="text-secondaryText/70 whitespace-nowrap">{startCity}</div>
            </div>
            <div className="absolute top-1.5 right-0 text-[10px] text-secondaryText text-right">
              <div className="font-bold text-primaryText">{stage.widthKm.toLocaleString()}</div>
              <div className="text-secondaryText/70 whitespace-nowrap">{endCity}</div>
            </div>
            {stage.points.map((p, i) => (
              <div key={i} className="absolute top-1.5 -translate-x-1/2 text-[10px] text-center" style={{ left: `${p.fraction * 100}%` }}>
                <div className="font-bold text-primaryText">{Math.round(p.fraction * stage.widthKm).toLocaleString()}</div>
                <div className="text-secondaryText/70 whitespace-nowrap">{p.name}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={goNext}
          className="shrink-0 w-9 h-9 rounded-full border border-border text-secondaryText hover:bg-yellow/10 hover:text-yellow transition flex items-center justify-center"
          aria-label="Next stage"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Every team, ordered by overall distance — click a row to jump the chart above to that team's stage. */}
      <div className="mt-6">
        <div className="grid gap-3 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-secondaryText" style={{ gridTemplateColumns: TEAM_LIST_COLS }}>
          <div>POS</div>
          <div>TEAM</div>
          <div>STAGE</div>
          <div>KM IN STAGE</div>
          <div>TOTAL KM</div>
        </div>
        <div className="mt-2 space-y-1.5">
          {positions.map((p, i) => {
            const pos = i + 1
            const isActiveStage = p.stageIndex === activeIndex
            const teamStage = MILESTONE_STAGES[p.stageIndex - 1]
            const kmInStage = Math.round(p.fraction * teamStage.widthKm)
            return (
              <button
                key={p.team.id}
                onClick={() => setActiveIndex(p.stageIndex)}
                className={
                  'w-full grid items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ' +
                  (isActiveStage ? 'bg-positive/10 border border-positive/60' : 'bg-elevated/60 border border-border hover:border-secondaryText')
                }
                style={{ gridTemplateColumns: TEAM_LIST_COLS }}
              >
                <div className="flex items-center gap-1.5 text-base font-bold">
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">{pos === 1 && <Trophy size={14} color="#FFD700" fill="#FFD700" />}</span>
                  <span>{pos}</span>
                </div>
                <div className="text-base font-bold truncate">{p.team.teamCode}</div>
                <div className="text-base font-semibold text-secondaryText">Stage {p.stageIndex}</div>
                <div className="text-base font-semibold">
                  {kmInStage.toLocaleString()} / {teamStage.widthKm.toLocaleString()} km
                </div>
                <div className="text-base font-bold">{Math.round(p.team.totalDistance).toLocaleString()} km</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
