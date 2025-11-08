# Corrección de Zona Horaria - Perú (UTC-5)

## Problema Identificado

La aplicación estaba grabando fechas y horas incorrectas. El método anterior usaba `getTimezoneOffset()` con una lógica invertida que **sumaba** horas en lugar de usar la hora correcta de Perú (UTC-5).

## Solución Implementada

### 1. Nueva utilidad de zona horaria

Creado archivo `utils/timezone.ts` con funciones especializadas:

```typescript
// Convierte cualquier fecha a hora de Perú (UTC-5)
export function toPeruTime(date: Date = new Date()): string

// Obtiene la fecha/hora actual de Perú
export function getPeruNow(): string

// Convierte timestamp de milisegundos a hora de Perú
export function timestampToPeruTime(timestamp: number): string
```

**Formato devuelto:** `"2024-11-07T10:30:45"` (sin la 'Z' de UTC)

### 2. Archivos Actualizados

#### `services/backgroundLocation.ts`
- Importa `timestampToPeruTime` de `@/utils/timezone`
- Usa `timestampToPeruTime(location.timestamp)` para convertir ubicaciones GPS
- Logs mejorados mostrando timestamp UTC y hora local de Perú

#### `services/cuadrillaRuta.ts`
- Importa `getPeruNow` de `@/utils/timezone`
- Usa `getPeruNow()` cuando no se proporciona timestamp
- Simplifica la lógica de conversión

#### `app/(tabs)/profile.tsx`
- Importa `getPeruNow` de `@/utils/timezone`
- Usa `getPeruNow()` para actualizar `updated_at` en ambas ubicaciones
- Elimina código duplicado de conversión

## Ventajas de este Cambio

1. **Precisión:** Usa `toLocaleString` con `timeZone: 'America/Lima'` que maneja correctamente:
   - Horario de verano (si aplica)
   - Zona horaria exacta de Perú (UTC-5)
   
2. **Consistencia:** Una sola función para todas las conversiones

3. **Mantenibilidad:** Si cambia la zona horaria, solo se actualiza un archivo

4. **Formato correcto:** Devuelve formato compatible con PostgreSQL sin 'Z'

## Cómo Funciona

```typescript
const now = new Date(); // Ej: 2024-11-07T15:30:45.000Z (UTC)

// Antes (INCORRECTO):
const offset = now.getTimezoneOffset() * 60000; // +300 minutos = +18000000 ms
const local = new Date(now.getTime() - offset); // SUMA 5 horas en lugar de restar
// Resultado: 2024-11-07T20:30:45 ❌ (Hora incorrecta)

// Ahora (CORRECTO):
const peruTime = toPeruTime(now);
// Resultado: 2024-11-07T10:30:45 ✅ (UTC-5, hora correcta de Perú)
```

## Próximos Pasos

1. Actualizar repositorio en GitHub:
```bash
git add .
git commit -m "Fix: Corregir zona horaria a Perú (UTC-5)"
git push origin main
```

2. Regenerar carpeta dist (ya completado)

3. Desplegar en Netlify

4. Probar en dispositivos Android/iOS/Web para verificar timestamps correctos

## Verificación

Para verificar que los timestamps son correctos:

1. Abrir la aplicación
2. Iniciar seguimiento de ubicación
3. Revisar tabla `cuadrilla_ruta` en Supabase
4. Verificar que el campo `timestamp` muestra la hora local de Perú

**Ejemplo esperado:**
- Hora actual en Perú: 10:30 AM
- Timestamp en DB: `2024-11-07T10:30:45`
- ✅ Coincide con la hora local

## Archivos Modificados

- ✅ `utils/timezone.ts` (NUEVO)
- ✅ `services/backgroundLocation.ts`
- ✅ `services/cuadrillaRuta.ts`
- ✅ `app/(tabs)/profile.tsx`
- ✅ `dist/` (regenerado con cambios)
