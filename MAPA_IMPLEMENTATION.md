# Implementación de Mapa Cross-Platform

## Resumen

Se ha implementado un sistema de mapas interactivos cross-platform que funciona tanto en móvil (iOS/Android) como en web, mostrando todos los sitios y cuadrillas del sistema.

## Tecnologías Utilizadas

### Móvil (iOS/Android)
- **react-native-maps** - Mapas nativos con soporte para Google Maps en Android y Apple Maps en iOS

### Web
- **leaflet** - Librería JavaScript para mapas interactivos
- **react-leaflet** - Wrapper de React para Leaflet
- **@types/leaflet** - Tipos de TypeScript para Leaflet

## Componentes Creados

### 1. MapView (Mapa Individual de Sitio)
- **MapView.native.tsx** - Versión móvil usando react-native-maps
- **MapView.web.tsx** - Versión web usando leaflet
- **MapView.tsx** - Wrapper que exporta la versión correcta según plataforma

Muestra un sitio específico con:
- Marcador del sitio
- Geofence (círculo de radio configurable)
- Ubicación actual del usuario (si disponible)

### 2. CrewsMapView (Mapa de Cuadrillas)
- **CrewsMapView.native.tsx** - Versión móvil
- **CrewsMapView.web.tsx** - Versión web con marcadores coloreados según estado
- **CrewsMapView.tsx** - Wrapper

Muestra múltiples cuadrillas con:
- Marcadores con colores según estado:
  - Verde: Disponible
  - Amarillo: Ocupado
  - Rojo: Fuera de servicio
- Popup con información al hacer clic

### 3. FullMapView (Mapa Completo - Sitios + Cuadrillas)
- **FullMapView.native.tsx** - Versión móvil
- **FullMapView.web.tsx** - Versión web
- **FullMapView.tsx** - Wrapper

Muestra todos los sitios y cuadrillas en un solo mapa:
- Marcadores azules para sitios
- Marcadores de colores para cuadrillas (según su estado)
- Información detallada en popups
- Centrado automático basado en los datos disponibles

## Páginas/Pantallas

### 1. app/(tabs)/crews-map.tsx
- Página de tabs visible solo para usuarios de oficina
- Muestra el mapa de cuadrillas con filtros por estado
- Lista de cuadrillas debajo del mapa
- Detalles de cuadrilla seleccionada
- Contador de sitios en el mapa (solo web)

### 2. app/map-office.tsx
- Página independiente (no en tabs)
- Mapa de pantalla completa
- Muestra TODOS los sitios y TODAS las cuadrillas
- Accesible desde el perfil de usuarios de oficina
- Header con contadores de sitios y cuadrillas

## Flujo de Acceso

1. **Usuario de Oficina** inicia sesión
2. Ve el tab "Mapa" en la navegación (crews-map)
3. Puede ir al "Perfil" y presionar "Ver Mapa Completo" para acceder a map-office
4. El mapa completo muestra todos los sitios (100) y todas las cuadrillas (15)

## Características Técnicas

### Platform-Specific Imports
El sistema usa el mecanismo de platform-specific extensions de React Native:
- `.native.tsx` - Se usa en iOS/Android
- `.web.tsx` - Se usa en web
- `.tsx` - Wrapper que importa la versión correcta

### Iconos en Web (Leaflet)
Se usan marcadores coloreados de la librería leaflet-color-markers:
- Azul: Sitios
- Verde: Cuadrillas disponibles
- Amarillo: Cuadrillas ocupadas
- Rojo: Cuadrillas fuera de servicio

### Safe Area Handling
- Se usa `useSafeAreaInsets()` para manejar áreas seguras en pantallas sin header
- Los componentes de mapa se adaptan automáticamente al espacio disponible

## Restricciones de Acceso

Solo usuarios con `userType === "oficina"` pueden:
- Ver el tab de "Mapa" en la navegación
- Acceder a la página de mapa completo (map-office)

Usuarios de campo solo ven:
- Tickets
- Perfil

## Datos Mostrados

### Sitios (Sites)
- 100 sitios de semilla en la data
- Cada sitio tiene: código, nombre, región, zona, coordenadas lat/lng
- Se filtran solo los sitios con coordenadas válidas

### Cuadrillas (Crews)
- 15 cuadrillas de semilla en la data
- Cada cuadrilla tiene: nombre, email, estado, zona, ubicación actual
- Se muestra ubicación en tiempo real si está disponible
- Estados: disponible, ocupado, fuera_servicio

## Rutas Configuradas

En `app/_layout.tsx`:
```typescript
<Stack.Screen
  name="map-office"
  options={{
    headerShown: true,
    title: "Mapa de Oficina",
  }}
/>
```

## Paquetes Instalados

```json
{
  "leaflet": "^latest",
  "react-leaflet": "^latest",
  "@types/leaflet": "^latest"
}
```

Los paquetes de móvil ya estaban instalados:
```json
{
  "react-native-maps": "1.20.1"
}
```

## Próximos Pasos Sugeridos

1. **Backend Integration**: Conectar con API real para actualizar ubicaciones en tiempo real
2. **Clustering**: Implementar clustering de marcadores cuando hay muchos sitios cercanos
3. **Filtros Avanzados**: Filtrar sitios por región, zona, departamento
4. **Rutas**: Calcular y mostrar rutas entre sitios
5. **Heatmaps**: Visualizar densidad de tickets o problemas por zona
6. **Histórico**: Mostrar trazas de movimiento de cuadrillas
7. **Notificaciones**: Alertas cuando cuadrillas llegan a sitios
8. **Optimización**: Lazy loading de marcadores para mejor performance

## Compatibilidad

✅ iOS (react-native-maps)
✅ Android (react-native-maps)
✅ Web (leaflet)

## Testing

Para probar el mapa:

1. **Móvil**: 
   ```bash
   bun run start
   ```
   Escanear QR con Expo Go

2. **Web**:
   ```bash
   bun run start-web
   ```
   Abrir en navegador

3. Iniciar sesión como usuario de oficina
4. Navegar a tab "Mapa" o ir a Perfil > "Ver Mapa Completo"
