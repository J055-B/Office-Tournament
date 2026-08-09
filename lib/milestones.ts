import route, { LOOP_KM } from '../data/route'

export interface MilestonePoint {
  name: string
  countryCode: string
  /** Position along this stage's flat bar, 0 (stage start) to 1 (stage end) — rescaled from the real route so points spread evenly across the standardized width. */
  fraction: number
}

export interface MilestoneStage {
  index: number // 1-based, matches the physical S1-S16 stages in data/route.ts
  label: string
  isPowerStage: boolean
  powerLabel?: string
  /**
   * Standardized milestone-space cumulative boundaries — NOT the real
   * driven distance (route.ts's cumulativeKm). Every regular stage is
   * drawn as a flat 1000km; the 3 stages already flagged POWER in
   * data/route.ts (Madrid→Porto, Toronto→Washington DC, Tulear→Toamasina)
   * are drawn at their power width (1500/1500/1250) instead — 13×1000 +
   * 1500+1500+1250 = 17,250km, which lands exactly on LOOP_KM. See the
   * "1000km normal / 1500 weekend 1,2 / 1250 weekend 3" ask, Aug 2026.
   */
  fromKm: number
  toKm: number
  widthKm: number
  points: MilestonePoint[]
  /** Real (actually driven) cumulative-km boundaries — used only to map a team's real totalDistance onto this stage's flat bar below. */
  realFromKm: number
  realToKm: number
}

interface StageDef {
  label: string
  endId: string
  milestoneWidth: number
  powerLabel?: string
}

// Mirrors the "// S#" grouping already commented in data/route.ts's RAW
// waypoint list — each entry's endId is that stage's final waypoint.
const STAGE_DEFS: StageDef[] = [
  { label: 'Sofia → Trieste', endId: 'trieste', milestoneWidth: 1000 },
  { label: 'Trieste → Roma', endId: 'roma', milestoneWidth: 1000 },
  { label: 'Roma → Marseille', endId: 'marseille', milestoneWidth: 1000 },
  { label: 'Marseille → Madrid', endId: 'madrid', milestoneWidth: 1000 },
  { label: 'Madrid → Porto', endId: 'porto', milestoneWidth: 1500, powerLabel: 'POWER STAGE 1' },
  { label: 'Porto → Barcelona', endId: 'barcelona', milestoneWidth: 1000 },
  { label: 'Barcelona → Paris', endId: 'paris', milestoneWidth: 1000 },
  { label: 'Paris → London', endId: 'london', milestoneWidth: 1000 },
  { label: 'Quebec City → Toronto', endId: 'toronto', milestoneWidth: 1000 },
  { label: 'Toronto → Washington DC', endId: 'washington-dc', milestoneWidth: 1500, powerLabel: 'POWER STAGE 2' },
  { label: 'Mexico City → Veracruz', endId: 'veracruz', milestoneWidth: 1000 },
  { label: 'Veracruz → Ciudad de Guatemala', endId: 'ciudad-de-guatemala', milestoneWidth: 1000 },
  { label: 'Ciudad de Guatemala → San Jose', endId: 'san-jose', milestoneWidth: 1000 },
  { label: 'San Jose → Panama', endId: 'panama', milestoneWidth: 1000 },
  { label: 'Tulear → Toamasina', endId: 'toamasina', milestoneWidth: 1250, powerLabel: 'FINAL POWER STAGE' },
  { label: 'Ashkelon → Beer Sheva', endId: 'beer-sheva', milestoneWidth: 1000 }
]

export const MILESTONE_STAGES: MilestoneStage[] = (() => {
  let realCursor = 0
  let milestoneCursor = 0
  let ptCursor = 0

  return STAGE_DEFS.map((def, i) => {
    const endIndex = route.findIndex((w) => w.id === def.endId)
    const realFromKm = realCursor
    const realToKm = route[endIndex].cumulativeKm
    const span = realToKm - realFromKm

    // Inner cities strictly between this stage's start and its own
    // endpoint — flight-arrival waypoints (0km from the previous stage's
    // end) land exactly at fraction 0 and are filtered out here since
    // they'd just duplicate the stage's own start label.
    const points: MilestonePoint[] = route
      .slice(ptCursor, endIndex)
      .filter((w) => w.cumulativeKm > realFromKm)
      .map((w) => ({
        name: w.name,
        countryCode: w.countryCode,
        fraction: span ? (w.cumulativeKm - realFromKm) / span : 0
      }))

    const fromKm = milestoneCursor
    const toKm = milestoneCursor + def.milestoneWidth

    realCursor = realToKm
    milestoneCursor = toKm
    ptCursor = endIndex + 1

    return {
      index: i + 1,
      label: def.label,
      isPowerStage: !!def.powerLabel,
      powerLabel: def.powerLabel,
      fromKm,
      toKm,
      widthKm: def.milestoneWidth,
      points,
      realFromKm,
      realToKm
    }
  })
})()

export const MILESTONE_TOTAL_KM = MILESTONE_STAGES[MILESTONE_STAGES.length - 1].toKm

// Maps a team's real totalDistance onto the flat milestone chart: which of
// the 16 stages they're currently in, and how far across that stage's bar
// (0-1) — ignores lap number, always relative to the current lap's position.
export function milestonePositionForDistance(totalDistance: number) {
  const wrapped = ((totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM

  let stage = MILESTONE_STAGES[MILESTONE_STAGES.length - 1]
  for (const s of MILESTONE_STAGES) {
    if (wrapped <= s.realToKm) {
      stage = s
      break
    }
  }

  const span = stage.realToKm - stage.realFromKm
  const fraction = span ? Math.max(0, Math.min(1, (wrapped - stage.realFromKm) / span)) : 0

  return { stageIndex: stage.index, fraction }
}

export interface StageBoundaryPoint {
  /** The stage that ENDS here (1-16). 0 = the very first point (Sofia, the tour's overall start). null = a flight-arrival city that isn't itself a STAGE_DEFS endpoint (e.g. Quebec City, landed mid-Stage 9) — still gets a dot so the dashed flight line doesn't dead-end into nothing. */
  stageIndex: number | null
  name: string
  countryCode: string
  coords: [number, number]
}

// The cities where one stage hands off to the next (Sofia + each of the 16
// STAGE_DEFS endpoints), PLUS every flight-arrival city that isn't already
// one of those — a flight can land mid-stage (e.g. Quebec City, inside
// Stage 9's "Quebec City → Toronto"), and without its own dot the dashed
// flight line just stops with no marker where the drivable road picks back
// up. Plotted as bigger red dots on the full map so it's visually obvious
// where each leg starts/ends, instead of one long undifferentiated line.
// See RouteMap.tsx.
export const STAGE_BOUNDARY_POINTS: StageBoundaryPoint[] = (() => {
  const first = route[0]
  const points: StageBoundaryPoint[] = [
    { stageIndex: 0, name: first.name, countryCode: first.countryCode, coords: first.coords as [number, number] }
  ]
  STAGE_DEFS.forEach((def, i) => {
    const wp = route.find((w) => w.id === def.endId)
    if (!wp) return
    points.push({ stageIndex: i + 1, name: wp.name, countryCode: wp.countryCode, coords: wp.coords as [number, number] })
  })
  // A 0km leg (same cumulativeKm as the previous waypoint) is a flight —
  // mark its arrival city too, unless it's already in the list above.
  for (let i = 1; i < route.length; i++) {
    if (route[i].cumulativeKm !== route[i - 1].cumulativeKm) continue
    const wp = route[i]
    const already = points.some((p) => p.coords[0] === wp.coords?.[0] && p.coords[1] === wp.coords?.[1])
    if (!already) points.push({ stageIndex: null, name: wp.name, countryCode: wp.countryCode, coords: wp.coords as [number, number] })
  }
  return points
})()
