# Resumen del Proyecto — Callisto Mundial

## ¿Qué es?
Página web para gestionar el **Callisto Mundial — The Sales Tournament Challenge**, un torneo interno de ventas estilo Copa del Mundo entre equipos de agentes organizados en dos pools (FTD y RET). Hosteado en GitHub + Vercel, con base de datos en tiempo real en Firebase.

## Stack
- **HTML/CSS/JS puro** — `index.html` (portada) + `panel.html` (dashboard)
- **Vercel** — hosting y auto-deploy desde GitHub (repo: `J055-B/Office-Tournament`)
- **Firebase Realtime Database** — sincronización en tiempo real entre usuarios
- **Google Sheets** — fuente de datos de ventas (pendiente de conectar)

## URLs
- **Web pública:** `mundial-callisto.vercel.app`
- **Firebase DB:** `https://mundial-callisto-default-rtdb.europe-west1.firebasedatabase.app`
- **Firebase Project ID:** `mundial-callisto`
- **Región:** Belgium (europe-west1)

## Credenciales
- Admin Joss → usuario `joss` → contraseña `35618728`
- Visitante → sin contraseña, solo lectura

## Estructura del torneo

### Pool A — FTD (7 equipos)
1. FTD BG IT (🇮🇹)
2. FTD BG ES (🇪🇸)
3. FTD BG EN + Canva (🇬🇧)
4. FTD IL ES (🇮🇱)
5. FTD BS ES (🏳️ — por confirmar)
6. FTD MADA 1-3-4 FR (🇲🇬)
7. FTD IL FR (🇫🇷)

### Pool B — RET (7 equipos, 5 confirmados + 2 por definir)
1. RET BG IT (🇮🇹)
2. RET BG ES (🇪🇸)
3. RET BG EN (🇬🇧)
4. RET IL ES (🇮🇱)
5. RET IL FR (🇫🇷)
6. RET BS ES (🏳️ — por confirmar)
7. Por definir (🏳️)

## Sistema de puntos

### Goles por día (% del target diario del equipo)
- < 100% = 0 goles
- 100% = 1 gol
- 120–125% = 2 goles
- 140–150% = 3 goles
- 160–175% = 4 goles
- 180–200%+ = 5 goles

### Puntos por partido
- Victoria = 3 pts
- Empate = 1 pt cada uno
- Derrota = 0 pts

### Formato
2 semanas por matchday, cada equipo juega 6 Home + 6 Away (vs todos los del pool + vuelta). El campeón de cada pool avanza a la Final de Campeones.

## Premios personales (10 total)
1. **MVP FTD** — % Target FTD (40%), % Target Calls (15%), % Target Call Time (15%), Most Money EUR (30%) — solo +3 meses
2. **MVP RET** — % Target Income (40%), % Target Calls (15%), % Target Call Time (15%), Most Money EUR (30%) — solo +3 meses
3. **Best Striker FTD** — Most FTDs (50%) + Most Money (50%) — tie rank: 1,2,2,2,5… — +3 meses
4. **Best Striker Canva** — Most Cons (30%) + Most Converted (70%) — +3 meses
5. **Best Striker RET** — Most Money — +3 meses
6. **Best Rookie** — FTD Desk, hasta 3 meses — Most FTDs (50%) + Most Money (50%)
7. **Best Team Leader FTD** — mismos criterios que MVP (40/15/15/30) — por FTD Team, no Lang Desk
8. **Best Team Leader RET** — mismos criterios que MVP (40/15/15/30)
9. **Best Progression FTD/Canva** — % Growth FTDs/Cons vs mes anterior
10. **Best Progression RET** — % Growth Income vs mes anterior

## Funcionalidades implementadas
- **Portada épica** — logo Callisto Mundial (badge con copa, fondo transparente), tagline "The Sales Tournament Challenge", efecto de rayos y brasas flotantes
- **Botón "Ingresar"** — entra como visitante (solo lectura)
- **Botón circular admin (candado)** — abre modal de login con usuario/contraseña
- **Panel con sidebar colapsable** — 4 secciones: Overview, Partidos, Premios, Reglas
- **Overview** — Marcador general Pool A vs Pool B, tablas de posiciones auto-calculadas desde resultados de partidos finalizados (P/W/D/L/DG/Pts)
- **Partidos** — Admin crea fixtures (local, visitante, semana), edita goles con click, cicla estado Próximo → En vivo → Final; posiciones se recalculan solas
- **Premios** — Los 10 premios con criterios y pesos; ganador y monto editables por admin
- **Reglas** — Sistema de goles y puntos fijo + bloque de texto libre editable
- **Todo editable por admin** — nombres de equipo, banderas, goles, ganadores, montos, reglas (contentEditable + Firebase sync)
- **Sync en tiempo real** — indicador verde "Sync" cuando está conectado a Firebase; cambios se ven al instante en todos los dispositivos
- **Chip de rol** — muestra "👑 Joss" para admin o "Visitante" para lectura
- **Sesión via sessionStorage** — el rol se mantiene mientras la pestaña esté abierta; se limpia al cerrar

## Firebase — Nodos
- `teams` → poolA / poolB → equipos con name y flag
- `fixtures` → poolA / poolB → partidos con home, away, week, homeGoals, awayGoals, status
- `prizes` → por categoría → winner + amount
- `settings` → seasonLabel, rulesText

## Assets
```
Office-Tournament/
├── index.html          ← portada + login
├── panel.html          ← dashboard del torneo
├── vercel.json         ← config de deploy
└── assets/
    └── callisto.png    ← badge Callisto Mundial (fondo transparente)
```

## Pendiente
- **Google Sheet** — conectar la hoja con datos de ventas para auto-refresh
- **Banderas definitivas** — cada equipo elige su país/bandera
- **Equipos faltantes Pool B** — confirmar los 2 equipos que faltan (RET BS ES y el 7mo)
- **Montos de premios** — cargar los valores en ILS/EUR por categoría
- **Fechas del torneo** — fecha de inicio, duración de cada match week, fecha de la final
- **Admins adicionales** — sumar más admins si es necesario (Adri u otros)

## Estado actual
- Portada funcionando en producción (`mundial-callisto.vercel.app`)
- Panel listo para subir al repo (pendiente upload a GitHub)
- Firebase creado y configurado con reglas abiertas
- Datos seed de equipos listos (se escriben automáticamente la primera vez que se abre el panel)
