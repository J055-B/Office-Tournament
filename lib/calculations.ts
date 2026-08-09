import { Team, LeaderboardEntry } from './types'
import { LOOP_KM, positionForDistance } from '../data/route'

// Tour de Callisto — 10 to 31 August 2026, one-off event (see the One Pager).
export const TOUR_START = '2026-08-10'
const TOUR_END = '2026-08-31'

const WEEKS = [
  { start: '2026-08-10', end: '2026-08-16' }, // Week 1
  { start: '2026-08-17', end: '2026-08-23' }, // Week 2
  { start: '2026-08-24', end: '2026-08-31' } // Week 3 (8 days)
]

// km awarded per 1% of daily target hit. Default is 10 (100% = 1,000km).
// Power Stage weekends pay more; everything else uses DEFAULT_RATE.
const POWER_RATE: Record<string, number> = {
  '2026-08-15': 15, // Power Stage 1 (Week 1 weekend)
  '2026-08-16': 15,
  '2026-08-22': 15, // Power Stage 2 (Week 2 weekend)
  '2026-08-23': 15,
  '2026-08-29': 12.5, // Final Power Stage (Week 3 weekend)
  '2026-08-30': 12.5
}
const DEFAULT_RATE = 10

function ratePerPercent(dateStr: string) {
  return POWER_RATE[dateStr] ?? DEFAULT_RATE
}

// Mon-Thu each get their own full daily target. Fri/Sat/Sun share one daily
// target instead of a fresh one per day — a no-op for every team except
// Madagascar (merged into "MADA + FR" — the Target sheet only gives that
// pair one combined target), which actually works through that block and
// gets double the shared target to compensate.
function isWeekendDate(dateStr: string) {
  const weekday = new Date(dateStr + 'T00:00:00Z').getUTCDay() // 0=Sun … 5=Fri, 6=Sat
  return weekday === 0 || weekday === 5 || weekday === 6
}

function isMadaSharedWeekendDay(teamCode: string, dateStr: string) {
  return teamCode === 'MADA + FR' && isWeekendDate(dateStr)
}

function dailyTargetForDate(team: Team, dateStr: string) {
  return team.dailyTarget * (isMadaSharedWeekendDay(team.teamCode, dateStr) ? 2 : 1)
}

export function computeTargetPct(sales: number, target: number) {
  if (!target) return 0
  return (sales / target) * 100
}

function kmForDay(team: Team, dateStr: string, sales: number) {
  const target = dailyTargetForDate(team, dateStr)
  const pct = computeTargetPct(sales, target)
  return pct * ratePerPercent(dateStr)
}

function weekFor(dateStr: string) {
  return WEEKS.find((w) => dateStr >= w.start && dateStr <= w.end)
}

function clampToTourRange(dateStr: string) {
  if (dateStr < TOUR_START) return TOUR_START
  if (dateStr > TOUR_END) return TOUR_END
  return dateStr
}

function eachDateBetween(start: string, end: string) {
  const dates: string[] = []
  let cursor = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return dates
}

// Fri+Sat+Sun collapse into a SINGLE unit within the week — teams don't get
// 3x the weekly target for a weekend they don't work. MADA + FR actually
// works the weekend (see isMadaSharedWeekendDay), so its weekend unit counts
// at 1.8x instead of 1x. Every other day in the week (Mon-Thu, plus Week 3's
// trailing Monday) counts as its own full unit.
function weekUnitsFor(week: { start: string; end: string }, teamCode: string) {
  const weekendMultiplier = teamCode === 'MADA + FR' ? 1.8 : 1
  let units = 0
  let weekendCounted = false
  for (const dateStr of eachDateBetween(week.start, week.end)) {
    if (isWeekendDate(dateStr)) {
      if (!weekendCounted) {
        units += weekendMultiplier
        weekendCounted = true
      }
    } else {
      units += 1
    }
  }
  return units
}

// Total km a team would need to hit "on pace" for the CURRENT calendar
// week — used by the /leaderboard page's per-team stat cards. Clamped to
// the tour's date range so it still returns something sensible before
// Aug 10 / after Aug 31. See weekUnitsFor for the Fri/Sat/Sun-as-one-day
// (or ×1.8 for MADA + FR) rule.
export function weeklyTargetForToday(dailyTarget: number, teamCode: string, today: Date = new Date()) {
  const todayStr = clampToTourRange(today.toISOString().slice(0, 10))
  const week = weekFor(todayStr) ?? WEEKS[WEEKS.length - 1]
  return dailyTarget * weekUnitsFor(week, teamCode)
}

// "DAY x of N" for the Hero panel — N is every calendar day from Aug 10 to
// Aug 31 inclusive (22 days). Clamped so it still reads sensibly before the
// Tour starts (DAY 1) or after it ends (DAY N).
export function tourDayInfo(today: Date = new Date()) {
  const allDays = eachDateBetween(TOUR_START, TOUR_END)
  const todayStr = clampToTourRange(today.toISOString().slice(0, 10))
  const idx = allDays.indexOf(todayStr)
  return { day: idx === -1 ? 1 : idx + 1, totalDays: allDays.length }
}

interface TeamMetrics {
  salesToday: number
  targetPct: number
  kmToday: number
  totalDistance: number
  weeklyDistance: number
}

function computeTeamMetrics(team: Team, todayStr: string): TeamMetrics {
  const salesByDate = new Map((team.dailyHistory ?? []).map((d) => [d.date, d.sales]))
  const lastDay = clampToTourRange(todayStr)
  const currentWeek = weekFor(todayStr) ?? weekFor(lastDay)

  let totalDistance = 0
  let weeklyDistance = 0

  if (todayStr >= TOUR_START) {
    for (const date of eachDateBetween(TOUR_START, lastDay)) {
      const sales = salesByDate.get(date) ?? 0
      const km = kmForDay(team, date, sales)
      totalDistance += km
      if (currentWeek && date >= currentWeek.start && date <= currentWeek.end) {
        weeklyDistance += km
      }
    }
  }

  const salesToday = salesByDate.get(todayStr) ?? 0
  const targetPct = computeTargetPct(salesToday, dailyTargetForDate(team, todayStr))
  const kmToday = kmForDay(team, todayStr, salesToday)

  return { salesToday, targetPct, kmToday, totalDistance, weeklyDistance }
}

export function computeLap(totalDistance: number) {
  return Math.floor(totalDistance / LOOP_KM) + 1
}

// Teams arrive already merged where the Target sheet only has one combined
// row for them (MADA + FTD IL FR) — see data-source.ts's getTeams().
export function computeLeaderboard(teams: Team[], today: Date = new Date()) {
  const todayStr = today.toISOString().slice(0, 10)

  const entries: LeaderboardEntry[] = teams.map((t) => {
    const metrics = computeTeamMetrics(t, todayStr)
    const position = positionForDistance(metrics.totalDistance)
    return {
      ...t,
      salesToday: metrics.salesToday,
      targetPct: metrics.targetPct,
      kmToday: metrics.kmToday,
      totalDistance: metrics.totalDistance,
      weeklyDistance: metrics.weeklyDistance,
      // Live race position, not the team's home desk — see positionForDistance.
      countryCode: position.countryCode,
      countryName: position.countryName,
      currentStage: position.currentStage,
      kmToNextWaypoint: position.kmToNextWaypoint,
      legProgressPct: position.legProgressPct,
      gap: 0,
      lap: computeLap(metrics.totalDistance)
    }
  })

  entries.sort((a, b) => b.totalDistance - a.totalDistance)
  const leader = entries[0]
  if (leader) {
    entries.forEach((e) => {
      e.gap = Math.round(leader.totalDistance - e.totalDistance)
    })
  }
  return entries
}
