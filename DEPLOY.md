# Deploy WebVR Car Agents

Guia corta para desplegar el frontend en Vercel y el backend de agentes en Railway.

## 1. Railway API

Despliega este repo como servicio Node.

Este proyecto incluye `railway.json`, asi que Railway debe arrancar la API con:

```sh
npm run api
```

Variables recomendadas en Railway:

```env
NODE_ENV=production
CORS_ORIGIN=https://TU-FRONT.vercel.app
CHAT_RATE_LIMIT_WINDOW_MS=600000
CHAT_RATE_LIMIT_MAX=40

OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_NAME=WebVR Car Agents
OPENROUTER_SITE_URL=https://TU-FRONT.vercel.app
OPENROUTER_TEMPERATURE=0.72
OPENROUTER_MAX_TOKENS=360
```

Opcional:

```env
OPENROUTER_MODEL_SAMI=openai/gpt-4o-mini
OPENROUTER_MODEL_ALFRED=openai/gpt-4o-mini
OPENROUTER_MODEL_PACO=openai/gpt-4o-mini
BETA_ACCESS_CODE=un-codigo-largo-y-privado
```

Notas:

- No definas `PORT`; Railway lo proporciona.
- La API escucha en `0.0.0.0:$PORT`.
- `GET /api/health` y `GET /api/agents` quedan publicos.
- Si defines `BETA_ACCESS_CODE`, `/api/chat` requerira el header `X-Beta-Access-Code`.
- La escena actual no envia todavia ese header; dejalo vacio hasta implementar una UI de codigo beta en el frontend.

## 2. Vercel Frontend

Build command:

```sh
npm run build
```

Output directory:

```txt
out
```

Variable necesaria en Vercel:

```env
NEXT_PUBLIC_API_URL=https://TU-API.up.railway.app
```

## 3. Pruebas Post-Deploy

Health:

```sh
curl -i https://TU-API.up.railway.app/api/health
```

Chat sin streaming:

```sh
curl -i https://TU-API.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"demo","agentId":"auto","message":"¿Qué coche es más radical en circuito?"}'
```

Chat streaming:

```sh
curl -i -N https://TU-API.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"demo","agentId":"auto","message":"¿Cuál suena más emocional?","stream":true}'
```

## 4. Seguridad Minima

- Usa una key de OpenRouter distinta para esta beta.
- Pon limite de gasto en OpenRouter.
- Mantén `CORS_ORIGIN` apuntando al dominio real de Vercel.
- No subas `.env` ni `.env.local`; usa variables del dashboard.
