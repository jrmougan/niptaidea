# NiP_taIdea

Juego de adivinanza con IA sarcástica. La IA piensa en un concepto secreto y tú tienes 15 preguntas para descubrirlo. Basado en la idea de Akinator pero con una personalidad condescendiente que te insulta si tardas demasiado.

## Cómo funciona

- La IA elige un concepto secreto de una de 5 categorías: Persona, Lugar, Animal, Obra o Concepto
- Tienes **15 preguntas** para adivinarlo
- Puedes hacer preguntas de sí/no o intentar adivinar directamente
- La IA responde: Sí, No, Frío, Tibio o Caliente
- Si aciertas: `CORRECTO: <concepto>`
- Si se acaban los intentos: `ERA: <concepto>`
- Los ganadores pueden guardar su puntuación en el top 10 (ordenado por intentos usados, luego por tiempo)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19 + Tailwind CSS v4 |
| IA | Gemini Flash 3 via OpenRouter (`@openrouter/ai-sdk-provider`) |
| Streaming | Vercel AI SDK v6 (`useChat`, `streamText`) |
| Base de datos | SQLite (`better-sqlite3`) |
| Despliegue | Docker + Coolify |

## Estructura

```
app/
  page.tsx                  # Landing con mini scoreboard
  game/page.tsx             # Partida (chat, timer, intentos)
  scoreboard/page.tsx       # Top 10 completo
  api/
    game/init/route.ts      # POST — genera concepto, devuelve token cifrado
    chat/route.ts           # POST — respuestas IA en streaming
    scores/route.ts         # GET/POST — scoreboard
lib/
  constants.ts              # Configuración (intentos, modelo, taunts)
  categories.ts             # Categorías con pesos y descripciones
  crypto.ts                 # AES-GCM para cifrar el concepto
  ratelimit.ts              # Rate limiter fixed-window en memoria
  db.ts                     # Conexión SQLite y schema
  utils.ts                  # Helpers (formatTime, getMessageText)
components/
  ChatMessage.tsx           # Burbuja de mensaje (IA / usuario)
  ResultScreen.tsx          # Pantalla de fin de partida
```

## Variables de entorno

```env
OPENROUTER_API_KEY=   # Requerido — clave de API de OpenRouter
GAME_SECRET=          # Opcional — clave para cifrar conceptos (mín. 32 chars)
DB_PATH=              # Opcional — ruta al archivo SQLite (default: ./data/scores.db)
```

## Desarrollo local

```bash
npm install

# Crear .env.local con las variables anteriores
npm run dev
# http://localhost:3000
```

La base de datos se crea automáticamente en el primer arranque.

## Despliegue con Docker

```bash
docker build -t niptaidea .
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=<key> \
  -e GAME_SECRET=<secret> \
  -v niptaidea-data:/app/data \
  niptaidea
```

El volumen en `/app/data` persiste la base de datos entre reinicios.

### Con Coolify

1. Crear servicio **Application** apuntando al repositorio GitHub
2. Coolify detecta el `Dockerfile` automáticamente
3. Añadir variables de entorno en la configuración del servicio
4. Montar volumen persistente en `/app/data`
5. Configurar webhook en GitHub (`Settings → Webhooks`) con la URL que proporciona Coolify para auto-despliegue en cada push a `main`

## Detalles de implementación

**Rate limiting** — 30 partidas por IP por hora (fixed-window, en memoria). Solo funciona en despliegue de instancia única.

**Cifrado del concepto** — El concepto se cifra con AES-GCM antes de enviarlo al cliente como token opaco, impidiendo que el jugador lo lea en las DevTools. La clave se deriva de `GAME_SECRET`.

**Validación de respuestas** — Se usa distancia de Levenshtein (≤ 2) para comparar la respuesta del jugador con el concepto real, permitiendo pequeños errores tipográficos.

**Conceptos sin repetición** — Los últimos 20 conceptos vistos se guardan en `localStorage` y se envían al endpoint `/api/game/init` para que el modelo los evite.

**Taunts automáticos** — Si el jugador lleva 60, 120, 180 o 240 segundos sin escribir, la IA inyecta un mensaje de burla automáticamente.

**Scoreboard** — Top 10 de partidas ganadas, ordenadas por intentos (ascendente) y luego por tiempo (ascendente). Si el marcador está lleno y la nueva puntuación es peor que la última, se descarta.
