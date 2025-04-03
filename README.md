# WebVR Experience PWA

Una aplicación WebVR progresiva para visores Pico Neo 3 y similares.

## Características

- Experiencia VR completa usando WebXR
- Progressive Web App instalable
- Modelos 3D interactivos con animaciones
- Movimiento en VR con controles intuitivos
- Optimizado para visores Pico

## Demo

La aplicación está disponible en: [URL de Vercel - actualizar después de desplegar]

## Requisitos

- Node.js 16+
- npm o yarn
- Un visor VR compatible con WebXR (como Pico Neo 3)

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Servir la versión de producción
npx serve out
```

## Despliegue en Vercel

1. Crea un repositorio en GitHub con el código
2. Conecta Vercel al repositorio
3. Configura el proyecto con:
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `out`

## Uso en Pico Neo 3

1. Abre el navegador Pico
2. Navega a la URL de la aplicación (deploy de Vercel)
3. Toca el botón "Instalar como App" cuando aparezca
4. Accede a la experiencia VR completa seleccionando "Escena Completa"

## Estructura de la Aplicación

- `/public/models/` - Modelos 3D en formato GLB/GLTF
- `/public/models/fbx/` - Animaciones FBX
- `/src/components/vr/` - Componentes para la experiencia VR
- `/src/app/` - Páginas y estructura de la aplicación

## PWA

La aplicación está configurada como Progressive Web App (PWA) con:

- Service Worker para funcionamiento offline
- Manifest para instalación en dispositivo
- Compatibilidad con instalación en Pico

## Licencia

MIT 