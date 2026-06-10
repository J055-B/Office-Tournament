# 🏆 Callisto Mundial — The Sales Tournament Challenge

Página de inicio del torneo interno de ventas de Callisto.

## 📁 Estructura

```
callisto-build/
├── index.html              ← Página de inicio (portada + login)
├── vercel.json             ← Config de deploy
└── assets/
    └── callisto.png        ← ⚠️ TU LOGO VA ACÁ (ver abajo)
```

## ⚠️ IMPORTANTE — El logo

El `index.html` busca tu logo en `assets/callisto.png`.

1. Asegurate de que el archivo que descargaste de Canva se llame **exactamente** `callisto.png`
2. Colocalo dentro de la carpeta `assets/`
3. Si lo descargaste con otro nombre o extensión (ej: `callisto.jpg`), tenés dos opciones:
   - Renombralo a `callisto.png`, **o**
   - Editá la línea del `<img src="assets/callisto.png" ...>` en `index.html` y poné el nombre real

Si la imagen no se encuentra, aparece automáticamente un logo de respaldo (🏆 CALLISTO MUNDIAL) para que la página nunca quede rota.

## 🔐 Acceso

- **Ingresar** → entra como visitante (solo lectura)
- **Botón circular (candado)** → login de administrador
  - Usuario: `Joss`
  - Contraseña: `35618728`

Para agregar más admins, editá el objeto `ADMINS` dentro del `<script>` en `index.html`.

## 🚀 Deploy en GitHub + Vercel

1. Subí todo el contenido de esta carpeta a tu repo de GitHub
2. En Vercel → New Project → importá el repo
3. Framework Preset: **Other** (es HTML puro, sin build)
4. Deploy → listo

Cada push a GitHub redeploya automáticamente.

## 📝 Próximos pasos

- `panel.html` → el panel del torneo (pools, standings, fixtures, premios).
  Los botones de la portada ya redirigen ahí. Se genera en el siguiente paso
  con los datos de Firebase y Google Sheets.
