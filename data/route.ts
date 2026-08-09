import { RoutePoint } from '../lib/types'

// The full waypoint chain for the Tour de Callisto's one-world loop (see
// the "Tour de Callisto — One Pager" PDF, pages 2-3). Every team starts at
// Sofia and advances through these waypoints in order as their totalDistance
// grows — cities are rolled past, not "stops". Distances between
// consecutive waypoints started from real highway driving distances
// (researched via web search, Aug 2026), then were scaled down ~2.2% and
// rounded to the nearest 5km so the full loop lands on an even 17,250km
// total (per the One Pager's official Tour distance) instead of the raw
// researched total (17,643km) — see the "17,250km" ask. The 4 flight legs
// (marked below) are treated as instantaneous — 0km, per the One Pager's
// "fly ✈" transitions.
//
// countryCode/countryName here are used to show each team's LIVE position
// on the route (see lib/calculations.ts's positionForDistance usage) — not
// a team's home desk (that's Team.location/language).
const COUNTRY_NAMES: Record<string, string> = {
  BG: 'Bulgaria',
  RS: 'Serbia',
  HR: 'Croatia',
  SI: 'Slovenia',
  IT: 'Italy',
  FR: 'France',
  ES: 'Spain',
  PT: 'Portugal',
  GB: 'United Kingdom',
  CA: 'Canada',
  US: 'United States',
  MX: 'Mexico',
  GT: 'Guatemala',
  SV: 'El Salvador',
  HN: 'Honduras',
  NI: 'Nicaragua',
  CR: 'Costa Rica',
  PA: 'Panama',
  MG: 'Madagascar',
  IL: 'Israel'
}

// [id, name, countryCode, legKmFromPreviousWaypoint, coords?]
type RawWaypoint = [string, string, string, number, [number, number]?]

const RAW: RawWaypoint[] = [
  // S1 Sofia -> Trieste
  ['sofia', 'Sofia', 'BG', 0, [42.6977, 23.3219]],
  ['nis', 'Nis', 'RS', 160, [43.3209, 21.8958]],
  ['belgrade', 'Belgrade', 'RS', 235, [44.7866, 20.4489]],
  ['zagreb', 'Zagreb', 'HR', 380, [45.815, 15.9819]],
  ['ljubljana', 'Ljubljana', 'SI', 115, [46.0569, 14.5058]],
  ['trieste', 'Trieste', 'IT', 100, [45.6495, 13.7768]],
  // S2 Trieste -> Roma
  ['venezia', 'Venezia', 'IT', 160, [45.4408, 12.3155]],
  ['milano', 'Milano', 'IT', 240, [45.4642, 9.19]],
  ['parma', 'Parma', 'IT', 125, [44.8015, 10.3279]],
  ['modena', 'Modena', 'IT', 60, [44.6471, 10.9252]],
  ['orvieto', 'Orvieto', 'IT', 285, [42.7186, 12.1109]],
  ['roma', 'Roma', 'IT', 120, [41.9028, 12.4964]],
  // S3 Roma -> Marseille
  ['pisa', 'Pisa', 'IT', 355, [43.7228, 10.4017]],
  ['torino', 'Torino', 'IT', 325, [45.0703, 7.6869]],
  ['aix-en-provence', 'Aix-en-Provence', 'FR', 330, [43.5297, 5.4474]],
  ['marseille', 'Marseille', 'FR', 30, [43.2965, 5.3698]],
  // S4 Marseille -> Madrid
  ['arles', 'Arles', 'FR', 90, [43.6766, 4.6278]],
  ['nimes', 'Nimes', 'FR', 30, [43.8367, 4.3601]],
  ['montpellier', 'Montpellier', 'FR', 55, [43.6108, 3.8767]],
  ['perpignan', 'Perpignan', 'FR', 150, [42.6986, 2.8954]],
  ['zaragoza', 'Zaragoza', 'ES', 470, [41.6488, -0.8891]],
  ['madrid', 'Madrid', 'ES', 310, [40.4168, -3.7038]],
  // S5 Madrid -> Porto (POWER 1500)
  ['malaga', 'Malaga', 'ES', 330, [36.7213, -4.4213]],
  ['lisbon', 'Lisbon', 'PT', 640, [38.7223, -9.1393]],
  ['porto', 'Porto', 'PT', 310, [41.1579, -8.6291]],
  // S6 Porto -> Barcelona
  ['mombuey', 'Mombuey', 'ES', 265, [42.0357, -6.3369]],
  ['cembranos', 'Cembranos', 'ES', 100, [42.5167, -5.7833]],
  ['burgos', 'Burgos', 'ES', 170, [42.3439, -3.6969]],
  ['barcelona', 'Barcelona', 'ES', 615, [41.3851, 2.1734]],
  // S7 Barcelona -> Paris
  ['beziers', 'Beziers', 'FR', 245, [43.3444, 3.2158]],
  ['clermont-ferrand', 'Clermont-Ferrand', 'FR', 340, [45.7772, 3.087]],
  ['orleans', 'Orleans', 'FR', 295, [47.9029, 1.9093]],
  ['paris', 'Paris', 'FR', 130, [48.8566, 2.3522]],
  // S8 Paris -> London, then FLIGHT to Quebec City
  ['dover', 'Dover', 'GB', 260, [51.1279, 1.3134]],
  ['portsmouth', 'Portsmouth', 'GB', 170, [50.8198, -1.088]],
  ['southampton', 'Southampton', 'GB', 35, [50.9097, -1.4044]],
  ['birmingham', 'Birmingham', 'GB', 210, [52.4862, -1.8904]],
  ['london', 'London', 'GB', 160, [51.5072, -0.1276]],
  ['quebec', 'Quebec City', 'CA', 0, [46.8139, -71.208]], // FLIGHT (0km) from London
  // S9 Quebec City -> Toronto
  ['sherbrooke', 'Sherbrooke', 'CA', 230, [45.4042, -71.8929]],
  ['montreal', 'Montreal', 'CA', 150, [45.5019, -73.5674]],
  ['ottawa', 'Ottawa', 'CA', 195, [45.4215, -75.6972]],
  ['toronto', 'Toronto', 'CA', 440, [43.6532, -79.3832]],
  // S10 Toronto -> Washington DC (POWER 1500), then FLIGHT to Mexico City
  ['springfield', 'Springfield', 'US', 730, [42.1015, -72.5898]],
  ['providence', 'Providence', 'US', 135, [41.824, -71.4128]],
  ['new-york-city', 'New York City', 'US', 285, [40.7128, -74.006]],
  ['philadelphia', 'Philadelphia', 'US', 155, [39.9526, -75.1652]],
  ['washington-dc', 'Washington DC', 'US', 225, [38.9072, -77.0369]],
  ['mexico-city', 'Mexico City', 'MX', 0, [19.4326, -99.1332]], // FLIGHT (0km) from Washington DC, arrives before S11 starts
  // S11 Mexico City -> Veracruz
  ['acapulco', 'Acapulco', 'MX', 375, [16.8531, -99.8237]],
  ['veracruz', 'Veracruz', 'MX', 725, [19.1738, -96.1342]],
  // S12 Veracruz -> Ciudad de Guatemala
  ['ciudad-de-guatemala', 'Ciudad de Guatemala', 'GT', 1085, [14.6349, -90.5069]],
  // S13 Ciudad de Guatemala -> San Jose, via the Interamericana overland
  // corridor through El Salvador, Honduras and Nicaragua (real driving
  // distances researched Aug 2026 — the old single 1156km GT->CR jump
  // skipped 3 countries the app already has flags for).
  ['san-salvador', 'San Salvador', 'SV', 285, [13.6929, -89.2182]],
  ['tegucigalpa', 'Tegucigalpa', 'HN', 320, [14.0723, -87.1921]],
  ['managua', 'Managua', 'NI', 365, [12.1364, -86.2514]],
  ['san-jose', 'San Jose', 'CR', 415, [9.9281, -84.0907]],
  // S14 San Jose -> Panama, then FLIGHT to Tulear
  ['panama', 'Panama City', 'PA', 835, [8.9824, -79.5199]],
  ['tulear', 'Tulear', 'MG', 0, [-23.352, 43.6694]], // FLIGHT (0km) from Panama City
  // S15 Tulear -> Toamasina (POWER 1250), then FLIGHT to Ashkelon
  ['antsirabe', 'Antsirabe', 'MG', 760, [-19.8667, 47.0333]],
  ['antananarivo', 'Antananarivo', 'MG', 165, [-18.8792, 47.5079]],
  ['toamasina', 'Toamasina', 'MG', 345, [-18.1497, 49.4023]],
  ['ashkelon', 'Ashkelon', 'IL', 0, [31.6688, 34.5715]], // FLIGHT (0km) from Toamasina
  // S16 Ashkelon -> Beer Sheva
  ['tel-aviv', 'Tel Aviv', 'IL', 50, [32.0853, 34.7818]],
  ['jerusalem', 'Jerusalem', 'IL', 50, [31.7683, 35.2137]],
  ['eilat', 'Eilat', 'IL', 335, [29.5581, 34.9482]],
  ['beer-sheva', 'Beer Sheva', 'IL', 195, [31.2518, 34.7913]]
  // Lap wraps: Beer Sheva -> Sofia is another instantaneous flight ("fly
  // Israel -> Sofia for lap 2" per the One Pager) — handled by
  // positionForDistance's modulo wrap, not an extra table row.
]

const route: RoutePoint[] = (() => {
  let cumulativeKm = 0
  return RAW.map(([id, name, countryCode, legKm, coords]) => {
    cumulativeKm += legKm
    return {
      id,
      name,
      countryCode,
      countryName: COUNTRY_NAMES[countryCode] ?? countryCode,
      cumulativeKm,
      coords
    }
  })
})()

export const LOOP_KM = route[route.length - 1].cumulativeKm

// Where a team currently is on the loop, given how much distance they've
// covered so far. Wraps around every LOOP_KM (completing the loop starts
// lap 2 back at Sofia — distance never resets, see computeLap).
export function positionForDistance(totalDistance: number) {
  const wrapped = ((totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM

  let idx = 0
  for (let i = 0; i < route.length; i++) {
    if (route[i].cumulativeKm <= wrapped) idx = i
    else break
  }

  const from = route[idx]
  const to = route[Math.min(idx + 1, route.length - 1)]
  const legKm = to.cumulativeKm - from.cumulativeKm

  return {
    // The country of the waypoint already reached — not the next one, so a
    // team sitting at km 0 reads as Bulgaria (Sofia), not Serbia (Nis).
    countryCode: from.countryCode,
    countryName: from.countryName,
    currentStage: from.id === to.id ? from.name : `${from.name} → ${to.name}`,
    // How many km are left to reach `to` (the destination named in currentStage).
    kmToNextWaypoint: Math.max(0, to.cumulativeKm - wrapped),
    // % of the current leg (from -> to) already covered — used to color the DISTANCE column.
    legProgressPct: legKm ? Math.max(0, Math.min(100, ((wrapped - from.cumulativeKm) / legKm) * 100)) : 100
  }
}

// The stage that comes AFTER the leg the leader is currently on — used by
// the Hero panel's third card ("what's coming up next"). Distinct from
// positionForDistance, which only tells you the CURRENT leg.
export function nextStageForDistance(totalDistance: number) {
  const wrapped = ((totalDistance % LOOP_KM) + LOOP_KM) % LOOP_KM

  let idx = 0
  for (let i = 0; i < route.length; i++) {
    if (route[i].cumulativeKm <= wrapped) idx = i
    else break
  }

  // idx -> idx+1 is the CURRENT leg (same as positionForDistance); the
  // NEXT leg starts at idx+1 and runs to idx+2.
  const from = route[Math.min(idx + 1, route.length - 1)]
  const to = route[Math.min(idx + 2, route.length - 1)]

  return {
    countryCode: from.countryCode,
    countryName: from.countryName,
    stageLabel: from.id === to.id ? from.name : `${from.name} → ${to.name}`,
    // Feed this into videoUrlForDistance to get that stage's city clip.
    cumulativeKm: from.cumulativeKm
  }
}

export default route
