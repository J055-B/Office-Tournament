'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import React, { useEffect, useMemo, useRef } from 'react'
import { LeaderboardEntry, RoutePoint } from '../../lib/types'
import { flagUrl } from '../../lib/flags'
import { LOOP_KM } from '../../data/route'
import { LatLng, pointOnLine, buildSegments, locate, jitter, ROUTE_LINE_COLOR, FLIGHT_LINE_COLOR } from '../../lib/route-geometry'
import { STAGE_BOUNDARY_POINTS } from '../../lib/milestones'

// A small, non-interactive preview of the route for the "Route Overview"
// card — plain straight lines between waypoints (no live OSRM fetch, unlike
// the full /map page) so it loads instantly, with each team's flag at its
// real current position. Click through to /map for the full picture.
export default function MiniRouteMap({ waypoints, teams }: { waypoints: RoutePoint[]; teams: LeaderboardEntry[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const segments = useMemo(() => buildSegments(waypoints), [waypoints])

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    const WORLD_BOUNDS = L.latLngBounds([-85, -175], [85, 175])
    const map = L.map(mapDivRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false,
      // Same fix as the full /map page — mostly moot now that there's no
      // tile server, but still a sane pan limit.
      worldCopyJump: false,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 1
    }).setView([25, 20], 1)
    map.getContainer().style.background = '#05090B' // app's page bg — shows through as "ocean"

    // Same country-outline GeoJSON as the full /map page instead of a live
    // tile server — see RouteMap.tsx for why.
    fetch('/world-countries.geo.json')
      .then((r) => r.json())
      .then((geojson) => {
        // Same fix as the full /map page: this resolves after the route/
        // marker layers below are added, so force it to the back or it'll
        // render on top of them.
        L.geoJSON(geojson, {
          interactive: false,
          style: { fillColor: '#141B20', fillOpacity: 1, color: '#232F36', weight: 0.5 }
        })
          .addTo(map)
          .bringToBack()
      })
      .catch(() => {})
    mapRef.current = map

    const routeLayer = L.layerGroup().addTo(map)
    segments.forEach((seg, i) => {
      const coords = seg.map((w) => w.coords as LatLng)
      L.polyline(coords, { color: ROUTE_LINE_COLOR, weight: 2, opacity: 0.85 }).addTo(routeLayer)
      const next = segments[(i + 1) % segments.length]
      L.polyline([seg[seg.length - 1].coords as LatLng, next[0].coords as LatLng], {
        color: FLIGHT_LINE_COLOR,
        weight: 1.5,
        opacity: 0.75,
        dashArray: '2 6'
      }).addTo(routeLayer)
    })

    // Same stage boundary dots as the full /map page, just smaller — this
    // widget is a quick preview, but still benefits from showing where one
    // stage ends and the next begins.
    STAGE_BOUNDARY_POINTS.forEach((p) => {
      L.circleMarker(p.coords, {
        radius: 3,
        color: '#FF3B30',
        weight: 1,
        fillColor: '#FF3B30',
        fillOpacity: 1
      }).addTo(routeLayer)
    })

    const markerLayer = L.layerGroup().addTo(map)
    teams.forEach((team, index) => {
      const wrapped = ((team.totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM
      const { segmentIndex, fraction } = locate(segments, wrapped)
      const seg = segments[segmentIndex]
      const [lat, lon] = jitter(pointOnLine(seg.map((w) => w.coords as LatLng), fraction), index, teams.length)
      const flag = flagUrl(team.countryCode)
      const html = flag
        ? `<img src="${flag}" title="${team.teamCode}" style="width:30px;height:21px;border-radius:3px;border:2px solid #ffd21f;box-shadow:0 2px 5px rgba(0,0,0,.7);object-fit:cover;display:block"/>`
        : `<div title="${team.teamCode}" style="width:16px;height:16px;border-radius:50%;background:#ffd21f;border:2px solid #14170f;box-shadow:0 2px 5px rgba(0,0,0,.7)"></div>`
      L.marker([lat, lon], { icon: L.divIcon({ className: '', html, iconSize: undefined, iconAnchor: [15, 10] }), zIndexOffset: index }).addTo(markerLayer)
    })

    const allCoords: LatLng[] = waypoints.filter((w) => w.coords).map((w) => w.coords as LatLng)
    if (allCoords.length) map.fitBounds(L.latLngBounds(allCoords), { padding: [8, 8] })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mapDivRef} className="h-full w-full" />
}
