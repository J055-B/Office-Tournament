import { RoutePoint } from './types'

export type LatLng = [number, number]

// Shared route-line palette — both the full map and the home mini-map
// import these, so they never drift out of sync with each other.
export const ROUTE_LINE_COLOR = '#2F81FF' // electric blue — the actual road path
export const ROUTE_ANCHOR_COLOR = '#5B6773' // faint gray fallback/anchor line
export const FLIGHT_LINE_COLOR = '#FF8D45' // orange dashed — flight legs

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371.0088
  const rad = (x: number) => (x * Math.PI) / 180
  const p1 = rad(a[0])
  const p2 = rad(b[0])
  const dp = rad(b[0] - a[0])
  const dl = rad(b[1] - a[1])
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function pointOnLine(coords: LatLng[], fraction: number): LatLng {
  if (!coords || coords.length < 2) return coords?.[0] ?? [0, 0]
  const lens: number[] = []
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineKm(coords[i], coords[i + 1])
    lens.push(d)
    total += d
  }
  let target = total * Math.max(0, Math.min(1, fraction))
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const t = lens[i] ? target / lens[i] : 0
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]
    }
    target -= lens[i]
  }
  return coords[coords.length - 1]
}

// Splits the waypoint chain wherever a leg is 0km (a flight) into
// contiguous drivable segments — see the One Pager's map legend: "Blue =
// road; orange dashed = flights".
export function buildSegments(waypoints: RoutePoint[]): RoutePoint[][] {
  if (waypoints.length === 0) return []
  const segments: RoutePoint[][] = []
  let current: RoutePoint[] = [waypoints[0]]
  for (let i = 1; i < waypoints.length; i++) {
    const legKm = waypoints[i].cumulativeKm - waypoints[i - 1].cumulativeKm
    if (legKm === 0) {
      segments.push(current)
      current = [waypoints[i]]
    } else {
      current.push(waypoints[i])
    }
  }
  segments.push(current)
  return segments
}

export function locate(segments: RoutePoint[][], wrappedKm: number) {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const segStart = seg[0].cumulativeKm
    const segEnd = seg[seg.length - 1].cumulativeKm
    if (wrappedKm >= segStart && (wrappedKm <= segEnd || i === segments.length - 1)) {
      const fraction = segEnd > segStart ? (wrappedKm - segStart) / (segEnd - segStart) : 0
      return { segmentIndex: i, fraction: Math.max(0, Math.min(1, fraction)) }
    }
  }
  return { segmentIndex: 0, fraction: 0 }
}

// Small deterministic offset so teams sitting at (near) the same km don't
// render as one indistinguishable marker.
export function jitter([lat, lon]: LatLng, index: number, total: number): LatLng {
  if (total <= 1) return [lat, lon]
  const angle = (index / total) * Math.PI * 2
  const radius = 1.2 // degrees — visible even at world zoom; markers converge as you zoom into a stage
  return [lat + Math.sin(angle) * radius, lon + Math.cos(angle) * radius]
}
