# Instrucciones para Configurar Zona Horaria de Perú

## Problema
Las fechas y horas se estaban registrando en UTC, pero necesitas que se registren en la zona horaria de Perú (America/Lima, UTC-5).

## Solución Implementada

### 1. **Utilidades de Fecha en el Código** ✅
Se creó el archivo `utils/dateUtils.ts` con funciones para:
- Convertir fechas a la zona horaria de Perú
- Generar timestamps en formato ISO con offset de Perú (-05:00)
- Separar fecha y hora en campos individuales

### 2. **Actualización de Servicios** ✅
Se actualizaron los servicios:
- `services/cuadrillaRuta.ts`: Usa hora de Perú al insertar puntos de ruta
- `services/backgroundLocation.ts`: Usa hora de Perú al registrar ubicaciones

### 3. **Base de Datos - PENDIENTE** ⚠️
Necesitas ejecutar el script SQL en Supabase para:
- Agregar columnas `fecha` y `hora` separadas
- Crear trigger que calcule automáticamente estas columnas desde `timestamp`
- Actualizar registros existentes con la zona horaria correcta

## Pasos a Seguir

### Paso 1: Ejecutar Script SQL en Supabase
1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor**
3. Copia el contenido del archivo `SUPABASE_ADD_FECHA_HORA_COLUMNS.sql`
4. Pega el script en el editor
5. Haz clic en **"Run"**

### Paso 2: Verificar la Configuración
Después de ejecutar el script, verifica que todo funcione correctamente:

```sql
-- Ver últimas 10 rutas con fecha y hora
SELECT 
  id,
  cuadrilla_id,
  fecha,
  hora,
  timestamp,
  latitud,
  longitud
FROM public.cuadrilla_ruta
ORDER BY created_at DESC
LIMIT 10;
```

Deberías ver:
- `fecha`: En formato YYYY-MM-DD (zona horaria Perú)
- `hora`: En formato HH:MM:SS (zona horaria Perú)
- `timestamp`: Con offset -05:00

### Paso 3: Probar la Funcionalidad
1. Inicia sesión con un usuario CAMPO
2. Permite los permisos de ubicación
3. Deja que la app registre algunas ubicaciones
4. Ve a Supabase y revisa la tabla `cuadrilla_ruta`
5. Verifica que `fecha` y `hora` estén en la zona horaria de Perú

## Ejemplo de Registro

Antes:
```
timestamp: 2025-11-08T02:22:31.922205+00:00  (UTC)
fecha: NULL
hora: NULL
```

Después:
```
timestamp: 2025-11-08T02:22:31.922205-05:00  (Perú)
fecha: 2025-11-07  (día anterior porque en Perú son 9:22 PM)
hora: 21:22:31.922205  (9:22 PM hora Perú)
```

## Cómo Funciona

### En el Código (TypeScript)
```typescript
// utils/dateUtils.ts convierte a hora de Perú
const peruTime = getPeruTimestamp();
// peruTime.fecha: "2025-11-07"
// peruTime.hora: "21:22:31.922"
// peruTime.timestamp: "2025-11-07T21:22:31.922-05:00"
```

### En la Base de Datos (SQL)
```sql
-- El trigger convierte automáticamente
-- timestamp UTC → fecha y hora en zona Perú
fecha = (timestamp AT TIME ZONE 'America/Lima')::DATE
hora = (timestamp AT TIME ZONE 'America/Lima')::TIME
```

## Ventajas de esta Solución

1. **Doble Garantía**: El código envía timestamps con offset -05:00, y la BD también calcula fecha/hora en zona Perú
2. **Corrección Automática**: Si el código envía UTC, el trigger de la BD lo corrige
3. **Consultas Fáciles**: Puedes filtrar por `fecha` sin conversiones complejas
4. **Registros Existentes**: El script actualiza automáticamente todos los registros previos

## Troubleshooting

### Si las fechas siguen saliendo mal:
1. Verifica que ejecutaste el script SQL completo
2. Revisa que el trigger se creó correctamente:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_fecha_hora';
   ```
3. Revisa los logs de la app para confirmar que se está usando `getPeruTimestamp()`

### Si hay errores al ejecutar el script:
- Asegúrate de tener permisos de administrador en Supabase
- Si las columnas ya existen, elimínalas primero:
  ```sql
  ALTER TABLE public.cuadrilla_ruta DROP COLUMN IF EXISTS fecha, DROP COLUMN IF EXISTS hora;
  ```
  Luego ejecuta el script nuevamente.

## Resumen

✅ **Código actualizado** - Ya usa zona horaria de Perú
⚠️ **Base de datos** - Necesitas ejecutar el script SQL
📝 **Archivo SQL** - `SUPABASE_ADD_FECHA_HORA_COLUMNS.sql`

¡Una vez ejecutes el script, todas las ubicaciones se registrarán con la fecha y hora correctas de Perú! 🇵🇪
