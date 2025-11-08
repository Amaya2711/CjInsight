# Carpeta DIST - Despliegue en Netlify

Esta carpeta contiene todos los archivos necesarios para publicar la aplicación en Netlify.

## 📁 Contenido

- **index.html** - Página principal de la aplicación
- **manifest.json** - Manifiesto de la PWA (Progressive Web App)
- **_redirects** - Configuración de redirecciones para SPA
- **icons/** - Iconos de la aplicación en formato PNG
  - icon-192x192.png
  - icon-512x512.png
- **_expo/** - Archivos estáticos generados por Expo
  - CSS compilado
  - JavaScript bundleado
- **assets/** - Recursos estáticos de la aplicación

## 🚀 Cómo Desplegar en Netlify

### Opción 1: Despliegue Manual (Drag & Drop)

1. Ir a [https://app.netlify.com/](https://app.netlify.com/)
2. Hacer clic en "Add new site" > "Deploy manually"
3. Arrastrar toda la carpeta **DIST** a la zona de drop
4. Esperar a que se complete el despliegue
5. Netlify te dará una URL pública (ej: https://tu-app.netlify.app)

### Opción 2: Despliegue desde GitHub

1. Subir el repositorio a GitHub
2. En Netlify: "Add new site" > "Import an existing project"
3. Conectar con GitHub y seleccionar el repositorio
4. Configurar build:
   - **Build command:** `npm run build` (o dejar vacío si ya está construido)
   - **Publish directory:** `DIST`
5. Hacer clic en "Deploy site"

### Opción 3: Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Autenticarse
netlify login

# Desplegar desde la carpeta DIST
cd DIST
netlify deploy --prod
```

## ⚙️ Configuración Incluida

### Manifest.json (PWA)
- Nombre: Field Tech Supervisor App
- Iconos: 192x192 y 512x512
- Modo: standalone
- Orientación: portrait
- Color de tema: #007bff

### Redirects (_redirects)
- Todas las rutas redirigen a index.html (SPA)
- Código de estado: 200 (rewrite)

### Headers (netlify.toml)
- Seguridad: X-Frame-Options, X-Content-Type-Options
- Cache: Optimizado para assets estáticos
- Compresión: Habilitada

## 🔧 Variables de Entorno

Si tu aplicación usa variables de entorno (como claves de Supabase), debes configurarlas en Netlify:

1. En tu sitio de Netlify, ir a "Site configuration" > "Environment variables"
2. Agregar las variables necesarias:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Etc.

## 📱 Características PWA

La aplicación está configurada como PWA, lo que permite:

- ✅ Instalación en dispositivos móviles
- ✅ Funcionamiento offline (con service worker)
- ✅ Acceso desde pantalla de inicio
- ✅ Splash screen personalizado
- ✅ Notificaciones push (si está implementado)

## 🔍 Verificación Post-Despliegue

Después del despliegue, verifica:

1. ✅ La página se carga correctamente
2. ✅ Las rutas funcionan (login, rutas-cuadrillas, etc.)
3. ✅ Los iconos se muestran correctamente
4. ✅ El manifest.json es accesible en `/manifest.json`
5. ✅ Los recursos estáticos (CSS, JS) se cargan
6. ✅ Las imágenes y assets se muestran

## 📊 Tamaño del Bundle

- **JavaScript:** ~3.9 MB (entry-*.js)
- **CSS:** ~10.5 KB (leaflet-*.css)
- **Assets:** ~18 archivos PNG
- **Total aproximado:** ~4 MB

## 🛠️ Regenerar DIST

Si necesitas regenerar la carpeta DIST:

```bash
# Limpiar carpeta anterior
Remove-Item -Recurse -Force DIST

# Exportar aplicación
npx expo export --platform web --output-dir DIST

# Copiar iconos
New-Item -ItemType Directory -Path "DIST\icons" -Force
Copy-Item "assets\images\icon.png" "DIST\icons\icon-512x512.png"
Copy-Item "assets\images\icon.png" "DIST\icons\icon-192x192.png"

# El manifest.json y _redirects ya están incluidos
```

## 📞 Soporte

Para problemas de despliegue:
- Revisar logs en Netlify: "Deploys" > "Deploy log"
- Verificar que todas las rutas API están configuradas
- Comprobar las variables de entorno

---

**Última actualización:** Noviembre 2025
**Versión:** 1.0.0
