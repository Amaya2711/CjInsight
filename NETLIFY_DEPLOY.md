# Despliegue en Netlify

## Carpeta DIST lista para publicación

La carpeta `dist` contiene la build optimizada de la aplicación web.

### Contenido:
- ✅ `index.html` - Página principal
- ✅ `favicon.ico` - Icono del sitio
- ✅ `_expo/` - Bundles de JavaScript y CSS
- ✅ `assets/` - Recursos estáticos (imágenes, iconos)
- ✅ `_redirects` - Configuración de rutas para SPA
- ✅ `metadata.json` - Metadata de la aplicación

### Configuración de Netlify:

**Opción 1: Despliegue Manual**
1. Ir a [Netlify](https://app.netlify.com/)
2. Arrastrar la carpeta `dist` al área de despliegue
3. ¡Listo!

**Opción 2: Despliegue desde Git**
1. Conectar el repositorio de GitHub
2. Configurar:
   - **Build command:** `npm run build:web`
   - **Publish directory:** `dist`
3. Agregar variables de entorno:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Variables de Entorno Requeridas:

```bash
EXPO_PUBLIC_SUPABASE_URL=tu_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### Comandos útiles:

```bash
# Generar nueva build
npm run build:web

# Validar la aplicación
npm run validate
```

### Características de la Build:

- 📦 Bundle optimizado (3.9 MB)
- 🎨 CSS optimizado (10.5 kB)
- 🖼️ Assets comprimidos
- 🗺️ Soporte para Leaflet maps
- 📱 Responsive design
- 🔄 Single Page Application (SPA) con enrutamiento

### Estructura de la aplicación:

```
dist/
├── index.html
├── favicon.ico
├── _redirects
├── metadata.json
├── _expo/
│   └── static/
│       ├── js/
│       └── css/
└── assets/
    └── [imágenes y recursos]
```

### Troubleshooting:

Si tienes problemas con las rutas:
- Verifica que `_redirects` esté en la carpeta `dist`
- Asegúrate que las variables de entorno estén configuradas en Netlify

Si el mapa no carga:
- Verifica la conexión a internet
- Revisa las credenciales de Supabase
