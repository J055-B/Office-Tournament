'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LeaderboardEntry, RoutePoint } from '../../lib/types'
import { flagUrl } from '../../lib/flags'
import { LOOP_KM, positionForDistance } from '../../data/route'
import {
  LatLng,
  pointOnLine,
  buildSegments,
  locate,
  jitter,
  ROUTE_LINE_COLOR,
  ROUTE_ANCHOR_COLOR,
  FLIGHT_LINE_COLOR
} from '../../lib/route-geometry'
import { MILESTONE_STAGES, milestonePositionForDistance, STAGE_BOUNDARY_POINTS } from '../../lib/milestones'

// ---- OSRM road-routing (this full interactive map only — see MiniRouteMap for the lightweight card preview) ----

async function routeChunk(chunk: RoutePoint[]) {
  const coord = chunk.map((p) => `${p.coords![1]},${p.coords![0]}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coord}?overview=full&geometries=geojson&steps=false&alternatives=false`
  const r = await fetch(url)
  if (!r.ok) throw new Error('OSRM HTTP ' + r.status)
  const j = await r.json()
  if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error('OSRM route unavailable')
  return j.routes[0] as { geometry: { coordinates: [number, number][] } }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The public OSRM demo server rate-limits bursts of requests — a chunk
// failing once doesn't mean the road is unroutable, it usually just means
// "try again in a moment". Retry before giving up on the whole segment.
async function routeChunkWithRetry(chunk: RoutePoint[], attempts = 3) {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(500 * attempt)
    try {
      return await routeChunk(chunk)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

// The public OSRM demo server sometimes rejects a long multi-waypoint
// request as a whole ("NoRoute") even though every individual leg in it
// routes fine on its own — observed e.g. on the Marseille..Malaga stretch.
// Rather than give up on the whole chunk (and fall back to a straight line
// across a huge stretch of real road), split the chunk in half and retry
// each half; only a single un-splittable leg (2 points) that still fails
// falls back to a straight line, so one bad pair never sinks the segment.
async function routeChunkGeometry(chunk: RoutePoint[]): Promise<LatLng[] | null> {
  if (chunk.length < 2) return null
  try {
    const route = await routeChunkWithRetry(chunk)
    return route.geometry.coordinates.map((x) => [x[1], x[0]])
  } catch {
    if (chunk.length <= 2) return null // single leg still fails — give up on just this leg
    const mid = Math.floor(chunk.length / 2)
    const left = chunk.slice(0, mid + 1) // overlap at the midpoint
    const right = chunk.slice(mid)
    const [leftCoords, rightCoords] = await Promise.all([routeChunkGeometry(left), routeChunkGeometry(right)])
    if (!leftCoords && !rightCoords) return null
    const leftFinal = leftCoords ?? left.map((w) => w.coords as LatLng)
    const rightFinal = (rightCoords ?? right.map((w) => w.coords as LatLng)).slice()
    if (leftFinal.length && rightFinal.length) rightFinal.shift()
    return leftFinal.concat(rightFinal)
  }
}

async function routeSegment(segment: RoutePoint[]): Promise<LatLng[] | null> {
  if (segment.length < 2) return null
  const max = 16
  const chunks: RoutePoint[][] = []
  for (let i = 0; i < segment.length - 1; i += max - 1) {
    chunks.push(segment.slice(i, Math.min(i + max, segment.length)))
  }
  let all: LatLng[] = []
  for (const chunk of chunks) {
    const geometry = await routeChunkGeometry(chunk)
    const c: LatLng[] = geometry ?? chunk.map((w) => w.coords as LatLng)
    if (all.length && c.length) c.shift()
    all = all.concat(c)
    await sleep(200) // be polite to the free public OSRM server between requests
  }
  return all.length ? all : null
}

export default function RouteMap({ waypoints, teams }: { waypoints: RoutePoint[]; teams: LeaderboardEntry[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)

  const segments = useMemo(() => buildSegments(waypoints), [waypoints])
  const [routedSegments, setRoutedSegments] = useState<(LatLng[] | null)[]>(() => segments.map(() => null))
  const [status, setStatus] = useState('Preparing map…')
  const [loading, setLoading] = useState(false)

  const [simulate, setSimulate] = useState(false)
  const [simKm, setSimKm] = useState(0)

  const avgDailyTarget = useMemo(() => {
    const withTarget = teams.filter((t) => t.dailyTarget > 0)
    if (withTarget.length === 0) return 0
    return withTarget.reduce((sum, t) => sum + t.dailyTarget, 0) / withTarget.length
  }, [teams])

  // Driven by MonitorMode.tsx's kiosk loop via /map?focus=N — when present,
  // fly to that team and show its info card bottom-left. Absent in normal
  // interactive use.
  const searchParams = useSearchParams()
  const focusParam = searchParams.get('focus')
  const focusIndex = focusParam !== null && focusParam !== '' ? Number(focusParam) : null
  const focusedTeam = focusIndex !== null && Number.isFinite(focusIndex) && teams.length > 0 ? teams[((focusIndex % teams.length) + teams.length) % teams.length] : null
  const focusedMilestone = focusedTeam ? milestonePositionForDistance(focusedTeam.totalDistance) : null
  const focusedPosition = focusedTeam
    ? { countryCode: focusedTeam.countryCode, countryName: focusedTeam.countryName }
    : null
  const focusedFlag = focusedPosition ? flagUrl(focusedPosition.countryCode) : null
  const focusedCity = focusedTeam?.currentStage?.split('→')[0]?.trim() || focusedPosition?.countryName

  async function loadRoadRoute() {
    setLoading(true)
    // Sequential, not Promise.all — the free public OSRM server rate-limits
    // bursts, and the biggest segment (Europe, 3 chunks) was the most likely
    // to lose that race when all 5 segments hit it at once.
    const results: (LatLng[] | null)[] = []
    for (let i = 0; i < segments.length; i++) {
      setStatus(`Loading road geometry from OSRM — segment ${i + 1} of ${segments.length}…`)
      results.push(await routeSegment(segments[i]))
      setRoutedSegments([...results, ...segments.slice(results.length).map(() => null)])
    }
    const failed = results.filter((r) => r === null).length
    setStatus(
      failed === 0
        ? `Exact road geometry loaded for all ${segments.length} drivable segments.`
        : `Road geometry loaded for ${segments.length - failed}/${segments.length} segments — the rest show the straight anchor line (OSRM was unavailable for those).`
    )
    setLoading(false)
  }

  // Initialize the Leaflet map once.
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    // preferCanvas is deliberately omitted: Leaflet's canvas renderer schedules
    // redraws via requestAnimationFrame, which can fire after React 18 Strict
    // Mode's dev-only double-mount has already torn the canvas down — the
    // default SVG renderer updates the DOM synchronously and avoids that.
    const WORLD_BOUNDS = L.latLngBounds([-85, -175], [85, 175])
    const map = L.map(mapDivRef.current, {
      zoomControl: true,
      // Keeps panning to a single world copy — mostly moot now that there's
      // no tile server to repeat, but still a sane pan limit.
      worldCopyJump: false,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 2
    }).setView([20, 15], 3)
    map.getContainer().style.background = '#05090B' // app's page bg — shows through as "ocean"

    // Our own dark country outlines instead of a live tile server. Data:
    // Natural Earth 110m admin-0 countries (public domain), trimmed to
    // geometry + name only, bundled at /public/world-countries.geo.json —
    // no external requests at runtime. This replaces CartoDB Dark Matter,
    // which needed an Enterprise license for commercial use, repeated the
    // world at low zoom, and had reference grid lines baked into the tile
    // images themselves — all gone by construction with a vector layer on
    // a flat background instead of raster tiles.
    fetch('/world-countries.geo.json')
      .then((r) => r.json())
      .then((geojson) => {
        // fetch() resolves after the route/marker layers below are already
        // added — Leaflet stacks newer layers on top, so without
        // bringToBack() the country shapes would render OVER the route
        // lines and team pins once this async call finally resolves.
        L.geoJSON(geojson, {
          interactive: false,
          style: { fillColor: '#141B20', fillOpacity: 1, color: '#232F36', weight: 0.75 }
        })
          .addTo(map)
          .bringToBack()
      })
      .catch(() => {
        // Best-effort — the map (routes, markers, stage dots) still works
        // without the country fill if this ever fails to load.
      })

    routeLayerRef.current = L.layerGroup().addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Open zoomed on wherever the teams currently are, not the whole
    // planet zoomed all the way out — the full route is still reachable by
    // scrolling/panning out.
    const initialPositions: LatLng[] = teams.map((team) => {
      const wrapped = ((team.totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM
      const { segmentIndex, fraction } = locate(segments, wrapped)
      const seg = segments[segmentIndex]
      return pointOnLine(seg.map((w) => w.coords as LatLng), fraction)
    })
    if (initialPositions.length) {
      map.fitBounds(L.latLngBounds(initialPositions), { padding: [80, 80], maxZoom: 6 })
    } else {
      const allCoords: LatLng[] = waypoints.filter((w) => w.coords).map((w) => w.coords as LatLng)
      if (allCoords.length) map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] })
    }

    loadRoadRoute()

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Draw / redraw the route lines whenever segments or their routed geometry change.
  useEffect(() => {
    const layer = routeLayerRef.current
    if (!layer) return
    layer.clearLayers()

    segments.forEach((seg, i) => {
      const anchorCoords = seg.map((w) => w.coords as LatLng)
      const routed = routedSegments[i]
      // Faint fallback anchor line, always drawn.
      L.polyline(anchorCoords, { color: ROUTE_ANCHOR_COLOR, weight: routed ? 2 : 3, opacity: routed ? 0.25 : 0.7, dashArray: routed ? undefined : '7 7' }).addTo(layer)
      if (routed && routed.length > 1) {
        L.polyline(routed, { color: ROUTE_LINE_COLOR, weight: 4, opacity: 0.95 }).addTo(layer)
      }
      // Dashed flight line from this segment's end to the next segment's start.
      const next = segments[(i + 1) % segments.length]
      const from = seg[seg.length - 1].coords as LatLng
      const to = next[0].coords as LatLng
      L.polyline([from, to], { color: FLIGHT_LINE_COLOR, weight: 2.5, opacity: 0.85, dashArray: '2 10' }).addTo(layer)
    })

    // Bigger red dots at every stage start/end, so it's obvious where one
    // stage hands off to the next along what would otherwise be one long
    // undifferentiated line.
    STAGE_BOUNDARY_POINTS.forEach((p) => {
      const label =
        p.stageIndex === 0
          ? `${p.name} — Tour start`
          : p.stageIndex === null
          ? `${p.name} — arrival after flight`
          : `${p.name} — Stage ${p.stageIndex} end / Stage ${p.stageIndex === MILESTONE_STAGES.length ? 1 : p.stageIndex + 1} start`
      L.circleMarker(p.coords, {
        radius: 7,
        color: '#FF3B30',
        weight: 2,
        fillColor: '#FF3B30',
        fillOpacity: 1
      })
        .bindTooltip(label, { direction: 'top', offset: [0, -6] })
        .addTo(layer)
    })
  }, [segments, routedSegments])

  // Draw / redraw team markers whenever teams, simulation state, or route geometry change.
  useEffect(() => {
    const layer = markerLayerRef.current
    if (!layer) return
    layer.clearLayers()

    teams.forEach((team, index) => {
      const realDistance = team.totalDistance
      const distance = simulate ? simKm * (avgDailyTarget ? team.dailyTarget / avgDailyTarget : 1) : realDistance
      const wrapped = ((distance % LOOP_KM) + LOOP_KM) % LOOP_KM
      const { segmentIndex, fraction } = locate(segments, wrapped)
      const seg = segments[segmentIndex]
      const coords = routedSegments[segmentIndex] ?? seg.map((w) => w.coords as LatLng)
      const [lat, lon] = jitter(pointOnLine(coords, fraction), index, teams.length)

      // In test mode, the flag/country/stage shown must match the simulated
      // position, not the real (pre-launch) one — otherwise every pin still
      // reads "Bulgaria" while visibly sitting somewhere else on the map.
      const position = simulate ? positionForDistance(distance) : { countryCode: team.countryCode, countryName: team.countryName, currentStage: team.currentStage }

      const flag = flagUrl(position.countryCode)
      const html = `
        <div style="display:flex;align-items:center;gap:4px;background:#1a1f18;border:1.5px solid #ffd21f;border-radius:999px;padding:2px 8px 2px 2px;box-shadow:0 2px 5px rgba(0,0,0,.5);white-space:nowrap">
          ${flag ? `<img src="${flag}" style="width:18px;height:13px;border-radius:2px;object-fit:cover"/>` : ''}
          <span style="font:700 11px Inter,Arial,sans-serif;color:#f4f1e8">${team.teamCode}</span>
        </div>`
      const icon = L.divIcon({ className: '', html, iconSize: undefined, iconAnchor: [10, 10] })
      const marker = L.marker([lat, lon], { icon, zIndexOffset: index })
      marker.bindPopup(
        `<b>${team.teamCode}</b><br/>${position.countryName}<br/>${position.currentStage || ''}<br/>${Math.round(realDistance).toLocaleString()} km${simulate ? ` real · ${Math.round(distance).toLocaleString()} km simulated` : ''}`
      )
      marker.addTo(layer)
    })
  }, [teams, simulate, simKm, segments, routedSegments, avgDailyTarget])

  // Fly to the focused team (?focus=N, driven by MonitorMode's kiosk loop)
  // whenever it changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusedTeam) return
    const wrapped = ((focusedTeam.totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM
    const { segmentIndex, fraction } = locate(segments, wrapped)
    const seg = segments[segmentIndex]
    const coords = routedSegments[segmentIndex] ?? seg.map((w) => w.coords as LatLng)
    const [lat, lon] = pointOnLine(coords, fraction)
    map.flyTo([lat, lon], 7, { duration: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIndex, teams, segments, routedSegments])

  return (
    <div className="space-y-4">
      <div className="relative">
        <div ref={mapDivRef} className="h-[78vh] min-h-[620px] w-full rounded-lg overflow-hidden border border-border" />
        {focusedTeam && (
          <div className="absolute left-4 bottom-4 z-[1000] bg-black/75 backdrop-blur-sm rounded-lg px-4 py-3 border border-border">
            <div className="text-sm font-bold">{focusedTeam.teamCode}</div>
            {focusedMilestone && <div className="text-xs text-secondaryText mt-0.5">STAGE {focusedMilestone.stageIndex}</div>}
            <div className="text-xs text-white/90 font-semibold mt-1 flex items-center gap-1.5">
              {focusedFlag && <img src={focusedFlag} alt="" className="w-4 h-2.5 rounded-sm object-cover" />}
              {focusedCity}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg p-4 app-surface flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-secondaryText">{status}</div>
        <button
          onClick={loadRoadRoute}
          disabled={loading}
          className="px-3 py-2 rounded-md bg-yellow text-black font-bold text-sm disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Reload exact road route'}
        </button>
      </div>

      <div className="rounded-lg p-4 border border-orange-400/50 bg-orange-400/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="flex items-center gap-2 text-sm font-bold text-orange-300">
            <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} />
            TEST MODE — preview positions before the Tour starts
          </label>
          <span className="text-xs text-secondaryText">Doesn't affect real data</span>
        </div>
        <input
          type="range"
          min={0}
          max={LOOP_KM}
          step={10}
          value={simKm}
          disabled={!simulate}
          onChange={(e) => setSimKm(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-secondaryText mt-1">
          {simulate ? `Simulated leader pace: ${simKm.toLocaleString()} km / ${LOOP_KM.toLocaleString()} km` : 'Enable to drag teams along the route for a preview'}
        </div>
      </div>
    </div>
  )
}
