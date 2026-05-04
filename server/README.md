# WebVR Car Agents API

Backend ligero para que los avatares de la escena respondan con OpenRouter.

## Arranque local

1. Crea `.env.local` a partir de `.env.example`.
2. Añade tu `OPENROUTER_API_KEY`.
3. Arranca la API:

```bash
npm run dev:api
```

La API escucha por defecto en `http://localhost:8787`.

En otra terminal, arranca la escena:

```bash
npm run dev
```

## Endpoints

- `GET /api/health`: estado del proveedor y modelo.
- `GET /api/agents`: lista publica de agentes.
- `GET /api/agents/:id`: datos publicos de un agente.
- `POST /api/chat`: respuesta de un agente.
- `GET /api/sessions/:sessionId/memory`: memoria en RAM.
- `DELETE /api/sessions/:sessionId`: borra una sesion.

## Chat

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo",
    "agentId": "auto",
    "message": "¿Qué coche es más radical en circuito?",
    "stream": true
  }'
```

Agentes disponibles:

- `sami`: Lamborghini Huracan.
- `alfred`: McLaren Senna.

Si `agentId` es `auto` o se omite, el backend elige avatar por palabras clave de la pregunta.
