# Modelos FBX con Animaciones

## Requisitos para modelos FBX
Para que los modelos FBX funcionen correctamente en la escena VR:

1. **Formato FBX 7.4 o anterior**
   - Exporta desde Blender o cualquier otro software 3D usando formato FBX 7.4 (binary)
   - Marca la opción "Embed Textures" si quieres incluir las texturas

2. **Optimización**
   - Intenta mantener los modelos por debajo de 50k triángulos para mejor rendimiento en VR
   - Usa texturas con tamaños potencia de 2 (ej: 1024x1024, 2048x2048)

3. **Animaciones**
   - Selecciona "Baked Animation" al exportar para mejores resultados
   - Asegúrate de que las animaciones tengan nombres descriptivos

## Uso en la escena VR

Para usar un modelo FBX animado en la escena:

1. Coloca el archivo `.fbx` en esta carpeta (`public/models/fbx/`)
2. Edita el archivo `src/components/vr/vr-scene.tsx`
3. Descomenta y modifica la sección de `<FBXModel>`:

```jsx
<FBXModel 
  url="/models/fbx/TU_MODELO.fbx" 
  position={[3, 0, -5]} 
  scale={0.02} 
  rotation={[0, -Math.PI/2, 0]} 
  animationIndex={0}
  animationSpeed={1}
  autoPlay={true}
/>
```

## Propiedades

- `url`: Ruta al archivo FBX (comenzando desde la carpeta `public`)
- `position`: Posición [x, y, z] del modelo
- `scale`: Escala del modelo (los modelos FBX suelen ser grandes, valores típicos: 0.01-0.05)
- `rotation`: Rotación [x, y, z] en radianes (usa Math.PI para conversión)
- `animationIndex`: Índice de la animación a reproducir (0 = primera animación)
- `animationSpeed`: Velocidad de reproducción (1 = normal, 0.5 = mitad, 2 = doble)
- `autoPlay`: `true` para reproducir automáticamente la animación al cargar

## Cambiar animaciones

Puedes hacer clic en el modelo para cambiar a la siguiente animación. 
Alternativamente, modifica el código para cambiar animaciones mediante controles o eventos específicos. 