import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";
import { safeGetJSON } from "@/utils/asyncStorageHelper";

export type Usuario = {
  id_usuario: string;         // UUID del usuario (id_usuario)
  nombre_usuario: string;     // Nombre de usuario para login
  tipo_usuario: string | null;// CAMPO u OFICINA
  id: number | null;          // ID de la cuadrilla asociada (campo USUARIO-ID en BD)
  id_empleado: string | null; // UUID del empleado
  cuadrilla_id?: number | null; // Alias para id (compatibilidad)
};

export type Cuadrilla = {
  id: number;
  nombre: string;
  zona: string | null;
  categoria: string | null;
  latitud: number | null;
  longitud: number | null;
};

const SESSION_KEY = "session_usuario";

/** 
 * Login directo contra la tabla USUARIO
 * Valida nombre_usuario y clave_usuario directamente en la tabla
 */
export async function loginConUsuarioClave(
  nombre_usuario: string, 
  clave_usuario: string
): Promise<{ usuario: Usuario; cuadrilla: Cuadrilla | null }> {
  console.log("[AUTH] ==================================");
  console.log("[AUTH] Iniciando login con usuario:", nombre_usuario);

  // 1) Consultar directamente la tabla usuario
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuario")
    .select("id_usuario, nombre_usuario, tipo_usuario, id, id_empleado, clave_usuario")
    .eq("nombre_usuario", nombre_usuario)
    .single();

  if (usuarioError || !usuarioData) {
    console.error("[AUTH] Error consultando usuario:", usuarioError);
    throw new Error("Usuario no encontrado");
  }

  console.log("[AUTH] Usuario encontrado:", {
    id_usuario: usuarioData.id_usuario,
    nombre: usuarioData.nombre_usuario,
    tipo: usuarioData.tipo_usuario,
    cuadrillaId: usuarioData.id
  });
  console.log("[AUTH] ✅ Variable global USUARIO-ID (ID Cuadrilla):", usuarioData.id);

  // 2) Validar la contraseña (comparación simple - la contraseña está encriptada en BD)
  if (usuarioData.clave_usuario !== clave_usuario) {
    console.error("[AUTH] Contraseña incorrecta");
    throw new Error("Contraseña incorrecta");
  }

  console.log("[AUTH] ✅ Credenciales validadas correctamente");

  // 3) Leer la cuadrilla asociada (si existe)
  let cuadrilla: Cuadrilla | null = null;
  if (usuarioData.id) {
    const { data: cuadrillaData, error: cuadrillaError } = await supabase
      .from("cuadrillas")
      .select("id, nombre, zona, categoria, latitud, longitud")
      .eq("id", usuarioData.id)
      .maybeSingle();

    if (cuadrillaError) {
      console.warn("[AUTH] Advertencia leyendo cuadrilla:", cuadrillaError.message);
    } else if (cuadrillaData) {
      cuadrilla = {
        id: cuadrillaData.id,
        nombre: cuadrillaData.nombre,
        zona: cuadrillaData.zona,
        categoria: cuadrillaData.categoria,
        latitud: cuadrillaData.latitud,
        longitud: cuadrillaData.longitud,
      };
      console.log("[AUTH] ✅ Cuadrilla asociada:", cuadrilla.nombre);
    }
  } else {
    console.log("[AUTH] Usuario sin cuadrilla asociada");
  }

  const usuario: Usuario = {
    id_usuario: usuarioData.id_usuario,
    nombre_usuario: usuarioData.nombre_usuario,
    tipo_usuario: usuarioData.tipo_usuario,
    id: usuarioData.id,
    id_empleado: usuarioData.id_empleado,
    cuadrilla_id: usuarioData.id,
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
  console.log("[AUTH] Usuario guardado en AsyncStorage");
  console.log("[AUTH] ==================================");

  return { usuario, cuadrilla };
}

export async function logoutUsuario() {
  console.log("[AUTH] Cerrando sesión...");
  await AsyncStorage.removeItem(SESSION_KEY);
  console.log("[AUTH] ✅ Sesión cerrada");
}

export async function getUsuarioGuardado(): Promise<Usuario | null> {
  return await safeGetJSON<Usuario | null>(SESSION_KEY, null);
}
