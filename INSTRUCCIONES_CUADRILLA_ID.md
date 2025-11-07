# Instrucciones para agregar cuadrilla_id a usuarios

## Problema
El sistema estaba intentando leer el campo `cuadrilla_id` de la tabla `usuarios`, pero esta columna no existía en la base de datos, causando el error:
```
column usuario.cuadrilla_id does not exist
```

## Solución

### Paso 1: Ejecutar el script SQL en Supabase

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor**
3. Ejecuta el contenido del archivo `SUPABASE_ADD_CUADRILLA_ID.sql`

Este script:
- Agrega la columna `cuadrilla_id` a la tabla `usuarios`
- Crea un índice para búsquedas rápidas
- Actualiza el usuario admin con un `cuadrilla_id` de ejemplo (120)
- Refresca el esquema del API

### Paso 2: Actualizar los usuarios existentes

Después de ejecutar el script, debes actualizar cada usuario con su `cuadrilla_id` correspondiente.

Por ejemplo:
```sql
-- Si el usuario CQ_AL tiene cuadrilla_id = 120
UPDATE public.usuarios 
SET cuadrilla_id = 120 
WHERE nombre_usuario = 'CQ_AL';

-- Actualiza otros usuarios según corresponda
UPDATE public.usuarios 
SET cuadrilla_id = 121 
WHERE nombre_usuario = 'otro_usuario';
```

### Paso 3: Verificar los cambios

```sql
-- Ver todos los usuarios con sus cuadrilla_id
SELECT id, nombre_usuario, rol, cuadrilla_id, activo 
FROM public.usuarios 
ORDER BY id;
```

## Cambios realizados en el código

1. **services/auth.ts**: 
   - Agregado `cuadrilla_id` al tipo `Usuario`
   - La consulta ahora lee el campo `cuadrilla_id` de la base de datos
   - El `cuadrilla_id` se guarda en AsyncStorage junto con los demás datos del usuario

2. **store/authStore.ts**:
   - El `cuadrilla_id` se mapea al campo `crewId` del usuario en `useAppStore`
   - Esto permite que el sistema sepa qué cuadrilla está asociada al usuario

## Uso del cuadrilla_id

Ahora cuando un usuario inicia sesión:
1. Se lee su `cuadrilla_id` de la base de datos
2. Se guarda en la sesión del usuario
3. Se puede usar para actualizar la ubicación de la cuadrilla cuando el usuario hace clic en "Iniciar seguimiento"

Por ejemplo, si el usuario `CQ_AL` tiene `cuadrilla_id = 120`, el sistema sabrá que debe actualizar la ubicación de la cuadrilla 120 en la tabla `cuadrillas`.

## Próximos pasos

Para implementar el seguimiento de ubicación:
1. El usuario inicia sesión y su `cuadrilla_id` se guarda globalmente
2. Cuando hace clic en "Iniciar seguimiento", el sistema:
   - Obtiene la ubicación actual del dispositivo
   - Actualiza los campos `cuadrillas_latitud` y `cuadrillas_longitud` en la tabla `cuadrillas`
   - Usa el `cuadrilla_id` del usuario para saber qué registro actualizar
