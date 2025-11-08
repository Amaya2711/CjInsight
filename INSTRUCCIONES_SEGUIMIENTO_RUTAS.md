# 📍 SISTEMA DE SEGUIMIENTO DE RUTAS - CUADRILLA_RUTA

## 🎯 Objetivo

Implementar un sistema que registre automáticamente el historial de todas las ubicaciones (coordenadas GPS) por las que pasa cada cuadrilla. Esto permite:

- **Visualizar la ruta completa** que ha seguido una cuadrilla durante el día
- **Análisis de desplazamiento** y eficiencia operativa
- **Auditoría de movimientos** para validación de servicios
- **Optimización de rutas** futuras basado en datos históricos

---

## 🗄️ Estructura de Base de Datos

### Tabla `cuadrilla_ruta`

```sql
CREATE TABLE public.cuadrilla_ruta (
  id BIGSERIAL PRIMARY KEY,
  cuadrilla_id INTEGER NOT NULL REFERENCES cuadrillas(id),
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accuracy REAL,          -- Precisión del GPS en metros
  altitude REAL,          -- Altitud en metros
  heading REAL,           -- Dirección/rumbo en grados (0-360)
  speed REAL,            -- Velocidad en m/s
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Relación con otras tablas

```
cuadrillas (tabla principal)
    ↓
    └─── cuadrilla_ruta (historial de ubicaciones)
```

Cada vez que se actualiza `cuadrillas.latitud` y `cuadrillas.longitud`, se crea un nuevo registro en `cuadrilla_ruta`.

---

## ⚙️ Cómo Funciona

### 1. **Trigger Automático en Base de Datos**

El trigger SQL `trigger_track_cuadrilla_ubicacion` se ejecuta automáticamente después de cada `UPDATE` en la tabla `cuadrillas`:

```sql
CREATE TRIGGER trigger_track_cuadrilla_ubicacion
AFTER UPDATE OF latitud, longitud ON public.cuadrillas
FOR EACH ROW
EXECUTE FUNCTION public.track_cuadrilla_ubicacion();
```

**¿Qué hace?**
- Detecta cuando cambia `latitud` o `longitud` de una cuadrilla
- Automáticamente inserta un nuevo punto en `cuadrilla_ruta` con:
  - `cuadrilla_id`: ID de la cuadrilla
  - `latitud`: Nueva latitud
  - `longitud`: Nueva longitud
  - `timestamp`: Fecha/hora actual

### 2. **Inserción Programática desde TypeScript**

Además del trigger, el código TypeScript también inserta puntos en `cuadrilla_ruta`:

**En `services/backgroundLocation.ts`:**
```typescript
// Después de actualizar cuadrillas
const result = await updateCuadrilla(crewId, {
  latitud: latitude,
  longitud: longitude,
});

// Si la actualización fue exitosa, registrar punto en ruta
if (result.data) {
  await insertCuadrillaRuta({
    cuadrilla_id: crewId,
    latitud: latitude,
    longitud: longitude,
    timestamp: new Date(location.timestamp).toISOString(),
    accuracy: accuracy || null,
    altitude: altitude || null,
    heading: heading || null,
    speed: speed || null,
  });
}
```

**En `services/cuadrillaRuta.ts`:**
- `insertCuadrillaRuta()`: Inserta un nuevo punto de ruta
- `getRutaByCuadrillaId()`: Obtiene todos los puntos de una cuadrilla
- `getRutaByCuadrillaIdTimeRange()`: Obtiene puntos en un rango de fechas
- `deleteCuadrillaRutaOlderThan()`: Limpia datos antiguos

---

## 🚀 Instalación y Configuración

### Paso 1: Ejecutar Script SQL

1. Ve a Supabase Dashboard: https://lgizmslffyaeeyogcdmm.supabase.co
2. Abre **SQL Editor**
3. Copia y pega el contenido completo de `SUPABASE_CREATE_CUADRILLA_RUTA.sql`
4. Presiona **Run** o **F5**

**Resultado esperado:**
```
✅ Tabla cuadrilla_ruta creada
✅ Índices creados para optimizar consultas
✅ Políticas RLS configuradas
✅ Trigger activo y funcionando
```

### Paso 2: Verificar Instalación

Ejecuta estas consultas para verificar:

```sql
-- 1. Verificar que la tabla existe
SELECT tablename FROM pg_tables WHERE tablename = 'cuadrilla_ruta';

-- 2. Verificar que el trigger está activo
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_track_cuadrilla_ubicacion';

-- 3. Ver estructura de la tabla
\d cuadrilla_ruta
```

### Paso 3: Probar el Sistema

**Prueba Manual:**

```sql
-- Actualizar ubicación de una cuadrilla
UPDATE public.cuadrillas 
SET latitud = -12.0464, longitud = -77.0428 
WHERE id = 1;

-- Ver el punto que se registró automáticamente
SELECT * FROM public.cuadrilla_ruta 
WHERE cuadrilla_id = 1 
ORDER BY timestamp DESC 
LIMIT 5;
```

---

## 📊 Consultas Útiles

### Ver historial completo de una cuadrilla

```sql
SELECT 
  cr.id,
  cr.cuadrilla_id,
  c.nombre as cuadrilla_nombre,
  cr.latitud,
  cr.longitud,
  cr.timestamp,
  cr.accuracy,
  cr.speed
FROM public.cuadrilla_ruta cr
LEFT JOIN public.cuadrillas c ON c.id = cr.cuadrilla_id
WHERE cr.cuadrilla_id = 1
ORDER BY cr.timestamp DESC;
```

### Ver rutas del día actual

```sql
SELECT 
  cr.*,
  c.nombre
FROM public.cuadrilla_ruta cr
LEFT JOIN public.cuadrillas c ON c.id = cr.cuadrilla_id
WHERE cr.timestamp::date = CURRENT_DATE
ORDER BY cr.cuadrilla_id, cr.timestamp;
```

### Contar puntos por cuadrilla

```sql
SELECT 
  c.id,
  c.nombre,
  COUNT(cr.id) as total_puntos,
  MIN(cr.timestamp) as primer_punto,
  MAX(cr.timestamp) as ultimo_punto
FROM public.cuadrillas c
LEFT JOIN public.cuadrilla_ruta cr ON cr.cuadrilla_id = c.id
GROUP BY c.id, c.nombre
ORDER BY total_puntos DESC;
```

### Calcular distancia recorrida (aproximada)

```sql
WITH ruta_ordenada AS (
  SELECT 
    cuadrilla_id,
    latitud,
    longitud,
    timestamp,
    LAG(latitud) OVER (PARTITION BY cuadrilla_id ORDER BY timestamp) as lat_anterior,
    LAG(longitud) OVER (PARTITION BY cuadrilla_id ORDER BY timestamp) as lng_anterior
  FROM public.cuadrilla_ruta
  WHERE cuadrilla_id = 1
    AND timestamp::date = CURRENT_DATE
)
SELECT 
  cuadrilla_id,
  COUNT(*) as puntos,
  SUM(
    -- Fórmula de Haversine simplificada (aproximación)
    2 * 6371 * ASIN(
      SQRT(
        POW(SIN(RADIANS(latitud - lat_anterior) / 2), 2) +
        COS(RADIANS(lat_anterior)) * COS(RADIANS(latitud)) *
        POW(SIN(RADIANS(longitud - lng_anterior) / 2), 2)
      )
    )
  ) as distancia_km
FROM ruta_ordenada
WHERE lat_anterior IS NOT NULL
GROUP BY cuadrilla_id;
```

---

## 🎨 Uso en la App (TypeScript)

### Obtener ruta de una cuadrilla

```typescript
import { getRutaByCuadrillaId } from '@/services/cuadrillaRuta';

// Obtener últimos 100 puntos
const { data, error } = await getRutaByCuadrillaId(1, 100);

if (data) {
  console.log(`Ruta con ${data.length} puntos`);
  data.forEach(punto => {
    console.log(`[${punto.timestamp}] (${punto.latitud}, ${punto.longitud})`);
  });
}
```

### Obtener ruta por rango de fechas

```typescript
import { getRutaByCuadrillaIdTimeRange } from '@/services/cuadrillaRuta';

const hoy = new Date();
const ayer = new Date(hoy);
ayer.setDate(ayer.getDate() - 1);

const { data, error } = await getRutaByCuadrillaIdTimeRange(1, ayer, hoy);
```

### Visualizar en mapa

```typescript
// Convertir puntos de ruta a formato para mapa
const rutaCoords = data?.map(punto => ({
  latitude: Number(punto.latitud),
  longitude: Number(punto.longitud),
}));

// Usar con react-native-maps
<Polyline
  coordinates={rutaCoords}
  strokeColor="#FF0000"
  strokeWidth={3}
/>
```

---

## 🧹 Mantenimiento

### Limpiar datos antiguos

```typescript
import { deleteCuadrillaRutaOlderThan } from '@/services/cuadrillaRuta';

// Eliminar rutas de más de 30 días
await deleteCuadrillaRutaOlderThan(30);
```

O directamente en SQL:

```sql
-- Eliminar rutas de más de 30 días
DELETE FROM public.cuadrilla_ruta
WHERE timestamp < NOW() - INTERVAL '30 days';
```

### Crear particiones (opcional, para grandes volúmenes)

Si acumulas millones de registros, considera particionar por fecha:

```sql
-- Crear tabla particionada (avanzado)
CREATE TABLE cuadrilla_ruta_partitioned (
  LIKE cuadrilla_ruta INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Crear particiones mensuales
CREATE TABLE cuadrilla_ruta_2025_01 
PARTITION OF cuadrilla_ruta_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 📈 Métricas y Analytics

### Puntos registrados hoy

```sql
SELECT COUNT(*) as puntos_hoy
FROM public.cuadrilla_ruta
WHERE timestamp::date = CURRENT_DATE;
```

### Cuadrillas más activas

```sql
SELECT 
  c.nombre,
  COUNT(cr.id) as puntos_registrados,
  MAX(cr.timestamp) as ultima_actualizacion
FROM public.cuadrillas c
LEFT JOIN public.cuadrilla_ruta cr ON cr.cuadrilla_id = c.id
WHERE cr.timestamp::date = CURRENT_DATE
GROUP BY c.id, c.nombre
ORDER BY puntos_registrados DESC;
```

---

## 🔧 Troubleshooting

### ❌ No se registran puntos en cuadrilla_ruta

**Causa 1:** El trigger no está activo
```sql
-- Verificar
SELECT tgenabled FROM pg_trigger 
WHERE tgname = 'trigger_track_cuadrilla_ubicacion';

-- Reactivar si está deshabilitado
ALTER TABLE public.cuadrillas ENABLE TRIGGER trigger_track_cuadrilla_ubicacion;
```

**Causa 2:** RLS bloqueando inserts
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'cuadrilla_ruta';

-- Desactivar RLS temporalmente (solo para debug)
ALTER TABLE public.cuadrilla_ruta DISABLE ROW LEVEL SECURITY;
```

**Causa 3:** Latitud/longitud no cambian realmente
```sql
-- El trigger solo se dispara si hay cambio real
-- Verifica que los valores sean distintos
SELECT latitud, longitud FROM cuadrillas WHERE id = 1;
```

### ⚠️ Muchos registros duplicados

Si el GPS reporta la misma ubicación muchas veces, considera:

1. Aumentar `distanceInterval` en background location
2. Filtrar duplicados con SQL antes de insertar
3. Agregar columna `last_update_hash` para detectar duplicados

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `SUPABASE_CREATE_CUADRILLA_RUTA.sql` en Supabase
- [ ] Verificar que la tabla existe: `SELECT * FROM cuadrilla_ruta LIMIT 1;`
- [ ] Verificar que el trigger está activo
- [ ] Probar con UPDATE manual en cuadrillas
- [ ] Verificar que se insertan puntos automáticamente
- [ ] Configurar limpieza automática de datos antiguos (opcional)
- [ ] Implementar visualización de rutas en la app (opcional)

---

## 🆘 Soporte

Si tienes problemas:

1. Verifica los logs de la consola del navegador
2. Revisa los logs de Supabase (Dashboard → Logs)
3. Ejecuta las consultas de verificación de este documento
4. Revisa que RLS no esté bloqueando las operaciones

---

**✅ Sistema implementado correctamente.**

Ahora cada vez que se actualice la ubicación de una cuadrilla (latitud/longitud), se registrará automáticamente un punto en `cuadrilla_ruta` con todos los detalles de GPS.
