# Organización de Assets

## 📁 Estructura

Los assets (imágenes y fuentes) ahora están organizados en `src/assets/`:

```
src/
└── assets/
    ├── images/
    │   ├── default.jpeg              # Imagen por defecto
    │   ├── menu.jpg                  # Imagen del menú
    │   ├── plantilla-welcome.jpg     # Plantilla de bienvenida
    │   └── 2d1237ee5bac33aecfb3d98aa23d224d.jpg  # Imagen de perfil
    └── fonts/
        └── ChocolateAdventure.ttf    # Fuente personalizada
```

## 🔧 Uso

Para usar los assets en tu código, importa la configuración centralizada:

```javascript
import { ASSETS } from "../config/assets.js";

// Usar una imagen
const welcomeImage = ASSETS.IMAGES.WELCOME_TEMPLATE;

// Usar una fuente
const font = ASSETS.FONTS.CHOCOLATE_ADVENTURE;

// Acceder al directorio base
const imagesDir = ASSETS.IMAGES.BASE;
```

## 📝 Ventajas

1. **Centralizado**: Todas las rutas en un solo lugar
2. **Fácil de mantener**: Cambiar una ruta solo requiere editar `assets.js`
3. **Type-safe**: Autocompletado en editores modernos
4. **Organizado**: Assets separados del código fuente

## 🔄 Compatibilidad

Las carpetas originales `images/` y `fonts/` en la raíz se mantienen por compatibilidad con código legacy. Eventualmente se pueden eliminar una vez que todo el código use las nuevas rutas.

## 📦 Archivo de Configuración

[`src/config/assets.js`](file:///c:/Users/USER/Desktop/app/archive-2026-02-01T064725Z/src/config/assets.js)
