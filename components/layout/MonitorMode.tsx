'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MONITOR_MODE_STORAGE_KEY, MONITOR_MODE_EVENT } from '../../lib/monitor-mode'

const HOME_DWELL_MS = 2 * 60 * 1000 // 2 min on the home page
const CYCLE_SLOT_MS = 15 * 1000 // 15s per team while cycling on the map
// We don't know the real team count from here (this lives in the root
// layout, above any page's data fetch) — 16 is a generous upper bound for
// the current roster. If the team count grows past that, bump this number;
// if it's smaller, the map page just wraps around (teams repeat) for the
// remainder of the cycling window, which is harmless.
const CYCLE_SLOTS = 16
const MAP_OVERVIEW_DWELL_MS = 2 * 60 * 1000 // 2 min general view before heading home

// Optional kiosk/TV loop, off by default: home (2 min) -> full map, panning
// to each team in turn every 15s (~4 min) -> full map overview (2 min) ->
// back to home, repeating. Toggled from the sidebar; persisted in
// localStorage so a kiosk display keeps it on across refreshes. Lives in
// the root layout (never unmounts on navigation) so its timers survive
// route changes — driving navigation via the URL (/map?focus=N) rather
// than React context, so the map page just reads its own search params.
export default function MonitorMode() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const read = () => setEnabled(localStorage.getItem(MONITOR_MODE_STORAGE_KEY) === '1')
    read()
    window.addEventListener('storage', read)
    window.addEventListener(MONITOR_MODE_EVENT, read)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener(MONITOR_MODE_EVENT, read)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!enabled) return

    function schedule(delay: number, action: () => void) {
      timerRef.current = setTimeout(action, delay)
    }

    function goHome() {
      router.replace('/dashboard')
      schedule(HOME_DWELL_MS, startCycling)
    }

    function startCycling() {
      tick(0)
    }

    function tick(slot: number) {
      router.replace(`/map?focus=${slot}`)
      if (slot + 1 >= CYCLE_SLOTS) {
        schedule(CYCLE_SLOT_MS, startOverview)
      } else {
        schedule(CYCLE_SLOT_MS, () => tick(slot + 1))
      }
    }

    function startOverview() {
      router.replace('/map')
      schedule(MAP_OVERVIEW_DWELL_MS, goHome)
    }

    goHome()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return null
}
