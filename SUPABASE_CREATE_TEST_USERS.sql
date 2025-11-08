-- ============================================================================
-- CREAR USUARIOS DE PRUEBA
-- ============================================================================
-- Este script crea usuarios de prueba con sus perfiles y cuadrillas asociadas
-- ============================================================================

-- PASO 1: Crear cuadrillas de prueba (si no existen)
-- ============================================================================

-- Borrar cuadrillas de prueba existentes (opcional, solo para testing)
-- DELETE FROM public.cuadrillas WHERE id IN (1, 2, 3);

-- Crear cuadrillas
INSERT INTO public.cuadrillas (id, nombre, zona, categoria, latitud, longitud)
VALUES 
  (1, 'Cuadrilla Lima Norte', 'Lima Norte', 'REGULAR', -11.9346, -77.0428),
  (2, 'Cuadrilla Lima Sur', 'Lima Sur', 'REGULAR', -12.1689, -76.9936),
  (3, 'Cuadrilla Callao', 'Callao', 'CHOQUE', -12.0565, -77.1181)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  zona = EXCLUDED.zona,
  categoria = EXCLUDED.categoria;

-- PASO 2: Crear usuarios en Supabase Auth
-- ============================================================================
-- IMPORTANTE: Ejecuta estos comandos UNO POR UNO y guarda los UUIDs generados
-- ============================================================================

-- Usuario 1: Juan Pérez (Cuadrilla Lima Norte)
-- Ejecuta este bloque y GUARDA el UUID que devuelve
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Intentar crear el usuario
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'juan.perez@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    ''
  ) RETURNING id INTO user_uuid;

  -- Crear perfil en tabla usuario
  INSERT INTO public.usuario (id_usuario, nombre_usuario, tipo_usuario, id, activo, clave_usuario)
  VALUES (
    user_uuid,
    'Juan Pérez',
    'campo',
    1,  -- ID de cuadrilla
    TRUE,
    NULL
  );

  RAISE NOTICE 'Usuario creado: juan.perez@example.com (UUID: %)', user_uuid;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'El usuario juan.perez@example.com ya existe';
END $$;

-- Usuario 2: María García (Cuadrilla Lima Sur)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'maria.garcia@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    ''
  ) RETURNING id INTO user_uuid;

  INSERT INTO public.usuario (id_usuario, nombre_usuario, tipo_usuario, id, activo, clave_usuario)
  VALUES (
    user_uuid,
    'María García',
    'campo',
    2,
    TRUE,
    NULL
  );

  RAISE NOTICE 'Usuario creado: maria.garcia@example.com (UUID: %)', user_uuid;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'El usuario maria.garcia@example.com ya existe';
END $$;

-- Usuario 3: Carlos López (Cuadrilla Callao)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'carlos.lopez@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    ''
  ) RETURNING id INTO user_uuid;

  INSERT INTO public.usuario (id_usuario, nombre_usuario, tipo_usuario, id, activo, clave_usuario)
  VALUES (
    user_uuid,
    'Carlos López',
    'campo',
    3,
    TRUE,
    NULL
  );

  RAISE NOTICE 'Usuario creado: carlos.lopez@example.com (UUID: %)', user_uuid;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'El usuario carlos.lopez@example.com ya existe';
END $$;

-- Usuario 4: Admin Oficina (Sin cuadrilla asignada)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    ''
  ) RETURNING id INTO user_uuid;

  -- Admin sin cuadrilla (id = 0 o NULL)
  INSERT INTO public.usuario (id_usuario, nombre_usuario, tipo_usuario, id, activo, clave_usuario)
  VALUES (
    user_uuid,
    'Admin Oficina',
    'oficina',
    0,  -- Sin cuadrilla
    TRUE,
    NULL
  );

  RAISE NOTICE 'Usuario creado: admin@example.com (UUID: %)', user_uuid;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'El usuario admin@example.com ya existe';
END $$;

-- PASO 3: Verificar usuarios creados
-- ============================================================================

-- Ver usuarios en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%@example.com'
ORDER BY created_at DESC;

-- Ver perfiles en tabla usuario
SELECT 
  u.id_usuario,
  u.nombre_usuario,
  u.tipo_usuario,
  u.id as cuadrilla_id,
  c.nombre as cuadrilla_nombre,
  c.zona,
  u.activo
FROM public.usuario u
LEFT JOIN public.cuadrillas c ON u.id = c.id
WHERE u.nombre_usuario IN ('Juan Pérez', 'María García', 'Carlos López', 'Admin Oficina')
ORDER BY u.nombre_usuario;

-- ============================================================================
-- CREDENCIALES DE PRUEBA
-- ============================================================================
-- 
-- Usuario 1:
--   Email: juan.perez@example.com
--   Password: password123
--   Tipo: campo
--   Cuadrilla: Cuadrilla Lima Norte (ID: 1)
-- 
-- Usuario 2:
--   Email: maria.garcia@example.com
--   Password: password123
--   Tipo: campo
--   Cuadrilla: Cuadrilla Lima Sur (ID: 2)
-- 
-- Usuario 3:
--   Email: carlos.lopez@example.com
--   Password: password123
--   Tipo: campo
--   Cuadrilla: Cuadrilla Callao (ID: 3)
-- 
-- Usuario 4:
--   Email: admin@example.com
--   Password: admin123
--   Tipo: oficina
--   Cuadrilla: ninguna
-- 
-- ============================================================================
